const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../../.env.integration");
dotenv.config({ path: envPath });
