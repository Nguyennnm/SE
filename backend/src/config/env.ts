import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from backend folder or root SE folder
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.POSTGRES_HOST || process.env.DB_HOST || '127.0.0.1',
  DB_PORT: Number(process.env.HOST_POSTGRES_PORT || process.env.POSTGRES_PORT || process.env.DB_PORT || 5434),
  DB_USER: process.env.POSTGRES_USER || process.env.DB_USER || 'ses_user',
  DB_PASSWORD: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'ses_dev_local_change_me_2026',
  DB_NAME: process.env.POSTGRES_DB || process.env.DB_NAME || 'smart_electronics_store',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
