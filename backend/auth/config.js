import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const serverConfig = {
  host: process.env.AUTH_SERVER_HOST || '127.0.0.1',
  port: Number(process.env.AUTH_SERVER_PORT || 8787),
  sessionCookieName: 'brw_session',
  sessionTtlMs: 1000 * 60 * 60 * 8,
  allowRegister: process.env.AUTH_ALLOW_REGISTER !== 'false',
  usersFilePath: path.join(__dirname, 'data', 'users.json'),
  secureCookie: process.env.NODE_ENV === 'production',
  allowedOrigin: process.env.AUTH_ALLOWED_ORIGIN || 'http://127.0.0.1:5173',
};
