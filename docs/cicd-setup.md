# CI/CD Manual Setup (Reproducibility)

This doc describes the one-time manual steps to enable the GitHub Actions deploy pipeline: GitHub OIDC in AWS, IAM roles, GitHub Environments, and secrets. Do these **before** the deploy workflow can run.

**Prerequisites:** AWS account, GitHub repo (e.g. `OWNER/REPO`), and permissions to create IAM resources and configure the repo.

---

## 1. Add GitHub as an OIDC provider in AWS (once per account)

1. In **AWS Console** → **IAM** → **Identity providers** → **Add provider**.
2. **Provider type:** OpenID Connect.
3. **Provider URL:** `https://token.actions.githubusercontent.com`
4. **Audience:** `sts.amazonaws.com`
5. **Add provider**. Note the provider ARN:  
   `arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com`

---

## 2. Create IAM roles for GitHub Actions (one per environment)

Create three roles: `github-actions-dev`, `github-actions-staging`, `github-actions-prod`. For each, replace placeholders and (optionally) narrow the trust condition.

### 2.1 Create the role

- **IAM** → **Roles** → **Create role**.
- **Trusted entity:** Custom trust policy (paste below).

**Trust policy** (replace `ACCOUNT_ID` and `OWNER/REPO`):

When the workflow job uses **GitHub Environments** (`environment: dev` etc.), GitHub sends a different **subject** in the OIDC token: `repo:OWNER/REPO:environment:ENV_NAME` (e.g. `repo:myorg/my-app:environment:dev`). So the trust policy must allow that form as well as the branch form. Use this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "ForAnyValue:StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:OWNER/REPO:ref:refs/heads/main",
            "repo:OWNER/REPO:environment:*"
          ]
        }
      }
    }
  ]
}
```

- **`ref:refs/heads/main`** — Allows runs from the `main` branch when no environment is used.
- **`environment:*`** — Allows jobs that use `environment: dev`, `environment: staging`, or `environment: prod` (required for the CD workflow).

Name the role (e.g. `github-actions-dev`). Do **not** add permissions yet; add them in the next step.

### 2.2 Attach permissions

Each role needs enough permissions for CDK to deploy the stack (`InfraStack-dev`, `InfraStack-staging`, or `InfraStack-prod`). **You do not need to restrict by resource ARN** when the stacks don’t exist yet; use a policy that allows the required *services* in this account/region.

**Option A — Easiest to start:** Attach the managed policy **AdministratorAccess** to each role. CDK can then create and update everything. You can tighten this later (see below).

**Option B — Service-level least privilege:** Create a custom policy that allows the following *without* limiting to specific resource ARNs (so CDK can create new resources):

- **CloudFormation** — full (`cloudformation:*`)
- **Lambda** — create/update/delete functions, publish versions (`lambda:*`)
- **DynamoDB** — create/describe/delete tables, tag (`dynamodb:*`)
- **API Gateway v2** — APIs, routes, integrations, authorizers (`apigateway:*` for HTTP APIs)
- **Cognito** — User Pools and app clients (`cognito-idp:*`)
- **IAM** — create/attach/detach roles and policies for Lambda (`iam:*` or narrow to PassRole + create role/policy)
- **CloudWatch Logs** — log groups, retention (`logs:*`)
- **S3** — read/write to the CDK bootstrap bucket (e.g. `cdk-hnb659fds-assets-ACCOUNT_ID-REGION`)
- **SSM** — read `/cdk-bootstrap/...` if CDK uses it

Use the same policy (or Option A) for all three roles; the *role* is already scoped per environment (dev/staging/prod), and CDK will create resources with names like `dev-*`, `staging-*`, `prod-*`.

**Optional later:** After your stacks exist, you can harden by “scoping by resource”—e.g. in the policy, restrict Lambda to only functions whose names start with `dev-` (or `staging-` / `prod-`). That means adding a `Resource` condition like `arn:aws:lambda:REGION:ACCOUNT_ID:function:dev-*`. Not required to get the pipeline working.

#### Option B — Use the policy JSON directly

You can set the permissions from the start with a single JSON document. Use either path:

**Path 1 — Customer managed policy (recommended):** Create the policy once, then attach it to all three roles.

1. **IAM** → **Policies** → **Create policy**.
2. Open the **JSON** tab, delete the default `{}`, and paste the policy below.
3. **Next** → name the policy (e.g. `GitHubActionsCDKDeploy`) → **Create policy**.
4. When creating each role (or editing it), **Add permissions** → **Attach policies directly** → search for `GitHubActionsCDKDeploy` → attach.

**Path 2 — Inline policy per role:** When creating each role, after the trust policy and naming the role, **Add permissions** → **Create inline policy** → open the **JSON** tab, delete the default, paste the policy below → **Next** → name it (e.g. `CDKDeploy`) → **Create policy**.

**Policy JSON** (copy as-is):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFormation",
      "Effect": "Allow",
      "Action": "cloudformation:*",
      "Resource": "*"
    },
    {
      "Sid": "Lambda",
      "Effect": "Allow",
      "Action": "lambda:*",
      "Resource": "*"
    },
    {
      "Sid": "DynamoDB",
      "Effect": "Allow",
      "Action": "dynamodb:*",
      "Resource": "*"
    },
    {
      "Sid": "APIGateway",
      "Effect": "Allow",
      "Action": "apigateway:*",
      "Resource": "*"
    },
    {
      "Sid": "Cognito",
      "Effect": "Allow",
      "Action": "cognito-idp:*",
      "Resource": "*"
    },
    {
      "Sid": "IAMForLambda",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": "logs:*",
      "Resource": "*"
    },
    {
      "Sid": "S3Bootstrap",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::cdk-*",
        "arn:aws:s3:::cdk-*/*"
      ]
    },
    {
      "Sid": "SSMBootstrap",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/cdk-bootstrap/*"
    }
  ]
}
```

### 2.3 Note the role ARNs

After creating all three roles, copy each **Role ARN** (e.g. `arn:aws:iam::ACCOUNT_ID:role/github-actions-dev`). You will add these as **environment secrets** in section 4.

### 2.4 Allow GitHub Actions roles to use the CDK bootstrap

`cdk deploy` uploads assets to the bootstrap S3 bucket and runs CloudFormation by **assuming** two roles created by `cdk bootstrap`:

- **cdk-hnb659fds-file-publishing-role-ACCOUNT_ID-REGION** — uploads assets to the CDK bucket
- **cdk-hnb659fds-deploy-role-ACCOUNT_ID-REGION** — runs CloudFormation

By default, those roles only trust the account root (or the principal that ran bootstrap). Your GitHub Actions role must be allowed to assume them.

**Do this once per account/region** (the same bootstrap roles are used for all three environments):

1. **IAM** → **Roles** → open **cdk-hnb659fds-file-publishing-role-ACCOUNT_ID-REGION** (e.g. `cdk-hnb659fds-file-publishing-role-174771279983-us-east-1`).
2. **Trust relationships** → **Edit trust policy**.
3. Add a **new statement** (keep the existing one; do not remove the default principal). Add:

```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": [
      "arn:aws:iam::ACCOUNT_ID:role/github-actions-dev",
      "arn:aws:iam::ACCOUNT_ID:role/github-actions-staging",
      "arn:aws:iam::ACCOUNT_ID:role/github-actions-prod"
    ]
  },
  "Action": "sts:AssumeRole"
}
```

Replace `ACCOUNT_ID` with your 12-digit account ID. **Update policy**.

4. Repeat for **cdk-hnb659fds-deploy-role-ACCOUNT_ID-REGION**: **Trust relationships** → **Edit** → add the same statement (the three GitHub Actions role ARNs) → **Update policy**.

After this, the pipeline can assume these roles and deploy successfully.

---

## 3. GitHub Environments (required for approval gates)

1. In the **GitHub repo** → **Settings** → **Environments**.
2. Create three environments: **dev**, **staging**, **prod**.
3. **dev:** Leave no protection rules (auto-deploy).
4. **staging:** Add **Required reviewers** (e.g. 1). Save.
5. **prod:** Add **Required reviewers** (e.g. 1). Save.

The deploy workflow uses these environment names so that staging and prod deployments wait for approval.

---

## 4. GitHub Actions secrets (role ARNs) — environment secrets

Use **environment secrets** (not repository secrets) so each deploy job only has access to that environment’s role ARN.

1. In the **GitHub repo** → **Settings** → **Environments**.
2. For each environment (**dev**, **staging**, **prod**), open the environment → **Environment secrets** → **Add secret**.
3. Add one secret per environment with the **same name** and the **role ARN for that environment**:

| Environment | Secret name     | Value                                  |
|-------------|-----------------|----------------------------------------|
| dev         | `AWS_ROLE_ARN`  | ARN of `github-actions-dev`            |
| staging     | `AWS_ROLE_ARN`  | ARN of `github-actions-staging`        |
| prod        | `AWS_ROLE_ARN`  | ARN of `github-actions-prod`           |

The deploy workflow uses `secrets.AWS_ROLE_ARN` in each job; GitHub supplies the value for whichever environment that job uses. Do **not** store AWS access keys; the workflow uses OIDC only.

---

## 5. Verify

- **CI** (`.github/workflows/ci.yml`): Runs on pull requests; no AWS or secrets required.
- **Deploy** (`.github/workflows/cd.yml`): Runs on push to `main`. It will:
  1. Deploy to **dev** (job uses `environment: dev` and `secrets.AWS_ROLE_ARN`).
  2. Run integration tests against dev.
  3. Wait for approval, then deploy to **staging** (job uses `environment: staging` and `secrets.AWS_ROLE_ARN`).
  4. Run integration tests against staging.
  5. Wait for approval, then deploy to **prod** (job uses `environment: prod` and `secrets.AWS_ROLE_ARN`).

Ensure the CDK bootstrap stack exists in the account/region you deploy to (`cdk bootstrap` if needed).
