# AWS Serverless CRUD API

A serverless REST API for CRUD operations on **items**, built with AWS Lambda, API Gateway (HTTP API), DynamoDB, and Cognito. All routes are protected by JWT authentication.

## Tech stack

- **Runtime:** Node.js, TypeScript
- **Compute:** AWS Lambda (one function per route)
- **API:** API Gateway HTTP API, JWT authorizer (Cognito)
- **Data:** DynamoDB (on-demand)
- **Auth:** Amazon Cognito (User Pool + app client)
- **Infra:** AWS CDK (TypeScript)

## API

Base path: `/v1`. All endpoints require a valid Cognito JWT in the `Authorization` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/items` | List items (scoped to the authenticated user) |
| `POST` | `/v1/items` | Create item (body: `{ "name": "string" }`) |
| `GET` | `/v1/items/{id}` | Get item by ID |
| `PUT` | `/v1/items/{id}` | Update item (body: `{ "name": "string" }`) |
| `DELETE` | `/v1/items/{id}` | Delete item |

Items are multi-tenant: each record includes a `userId` (from the JWT) so users only see and modify their own data.

## Project structure

```
├── src/
│   ├── handlers/       # Lambda handlers (create, list, get, update, delete)
│   ├── lib/            # DynamoDB client, auth, HTTP helpers, validation
│   ├── schemas/        # Zod schemas for request/response
│   └── types.ts
├── infra/              # CDK app (stacks + constructs)
│   ├── bin/            # CDK entrypoint
│   └── lib/            # API, Lambda, DynamoDB, Cognito, alarms, dashboard
├── tests/              # Integration tests (CRUD + auth)
└── docs/
    ├── cicd-setup.md   # Manual steps for GitHub Actions → AWS (OIDC, IAM, envs)
    └── openapi.yaml    # OpenAPI 3 spec for the API
```

## Build and test

```bash
# Install (root + infra)
npm install && cd infra && npm install && cd ..

# Build
npm run build

# Unit tests (handlers + CDK)
npm test && cd infra && npm test

# Integration tests (need deployed stack): copy .env.integration.example → .env.integration,
# fill in values from your stack outputs (cdk deploy prints them), then:
npm run test:integration
```

Integration tests create a temporary Cognito user, get a JWT, and run the full CRUD flow plus validation and 401 checks. The runner needs IAM permissions: `cognito-idp:AdminCreateUser`, `cognito-idp:AdminSetUserPassword`, `cognito-idp:InitiateAuth`.

## Deploy

The stack can be deployed with a **stage** (dev / staging / prod). Default is `dev` if not set.

```bash
cd infra
npm run build
npx cdk bootstrap   # once per account/region
npx cdk deploy -c env=dev
```

Use `-c env=staging` or `-c env=prod` for other stages. CDK uses `NodejsFunction` and bundles from `src/` automatically. After deploy, the stack outputs include the API URL and Cognito User Pool / Client ID—use them to fill [.env.integration.example](.env.integration.example) (copy to `.env.integration`) and run integration tests.

## CI/CD

GitHub Actions run on every PR (unit + CDK tests) and on push to `main` (deploy pipeline). The deploy workflow uses **OIDC** to assume AWS roles—no long-lived keys—and deploys to **dev** → **staging** → **prod** with approval gates for staging and prod. After each deploy it runs integration tests against that environment. One-time setup (OIDC provider, IAM roles, GitHub Environments, environment secrets) is documented in [docs/cicd-setup.md](docs/cicd-setup.md).

## License

[MIT](LICENSE)
