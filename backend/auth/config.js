import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const serverConfig = {
  host: process.env.AUTH_SERVER_HOST || '0.0.0.0',
  port: Number(process.env.AUTH_SERVER_PORT || 8787),
  sessionCookieName: 'brw_session',
  sessionTtlMs: 1000 * 60 * 60 * 8,
  allowRegister: process.env.AUTH_ALLOW_REGISTER !== 'false',
  usersFilePath: path.join(__dirname, 'data', 'users.json'),
  importDataFilePath: path.join(__dirname, 'data', 'imports.json'),
  weiboOauthFilePath: path.join(__dirname, 'data', 'weibo_oauth_connections.json'),
  secureCookie: process.env.NODE_ENV === 'production',
  allowedOrigin: process.env.AUTH_ALLOWED_ORIGIN || 'http://localhost:5173',
  weiboOauthEnabled: process.env.WEIBO_OAUTH_ENABLED === 'true',
  weiboAppKey: process.env.WEIBO_APP_KEY || '',
  weiboAppSecret: process.env.WEIBO_APP_SECRET || '',
  weiboRedirectUri: process.env.WEIBO_REDIRECT_URI || '',
};
