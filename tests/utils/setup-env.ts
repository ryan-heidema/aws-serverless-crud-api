import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env.integration');
dotenv.config({ path: envPath });
