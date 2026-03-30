import http from 'node:http';

import { serverConfig } from './config.js';
import { verifyPassword, hashPassword } from './auth/password.js';
import { SessionStore } from './auth/sessions.js';
import { UserStore } from './auth/users.js';
import { ImportStore } from './imports/store.js';

const sessionStore = new SessionStore(serverConfig.sessionTtlMs);
const userStore = new UserStore();
const importStore = new ImportStore();

function maskEmail(email = '') {
  const [local = '', domain = ''] = email.split('@');
  if (!local) {
    return '***';
  }
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function logEvent(event, payload = {}) {
  const safePayload = { ...payload };
  if (safePayload.email) {
    safePayload.email = maskEmail(safePayload.email);
  }
  delete safePayload.password;
  delete safePayload.passwordHash;
  delete safePayload.sessionId;

  console.info(`[auth-server] ${event}`, safePayload);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });

    request.on('error', reject);
  });
}

function parseCookies(request) {
  const header = request.headers.cookie;
  if (!header) {
    return {};
  }

  return header.split(';').reduce((acc, entry) => {
    const [name, ...rest] = entry.trim().split('=');
    acc[name] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function buildCookie(sessionId, expiresAt) {
  const parts = [
    `${serverConfig.sessionCookieName}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];

  if (serverConfig.secureCookie) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildExpiredCookie() {
  const parts = [
    `${serverConfig.sessionCookieName}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (serverConfig.secureCookie) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

function validateNickname(nickname) {
  return (
    typeof nickname === 'string' &&
    nickname.trim().length >= 2 &&
    nickname.trim().length <= 32 &&
    /^[\p{L}\p{N}_\-\s]+$/u.test(nickname.trim())
  );
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 10 &&
    password.length <= 72 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function getCurrentUser(request) {
  const cookies = parseCookies(request);
  const sessionId = cookies[serverConfig.sessionCookieName];
  if (!sessionId) {
    return null;
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return null;
  }

  const user = userStore.findById(session.userId);
  if (!user || user.status !== 'active') {
    sessionStore.delete(sessionId);
    return null;
  }

  return {
    session,
    user: userStore.toPublicUser(user),
  };
}

function ensureAuthenticated(request, response) {
  const current = getCurrentUser(request);
  if (!current) {
    sendJson(
      response,
      401,
      { message: '登录状态已失效，请重新登录' },
      {
        'Set-Cookie': buildExpiredCookie(),
      },
    );
    return null;
  }

  return current;
}

function normalizeVisibleCommentText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function toImportedWeiboCommentItems(payload, currentUser) {
  const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl.trim() : '';
  const pageTitle = typeof payload.pageTitle === 'string' ? payload.pageTitle.trim() : '';
  const importedAt = typeof payload.importedAt === 'string' ? payload.importedAt : new Date().toISOString();
  const comments = Array.isArray(payload.comments) ? payload.comments : [];
  const batchId = `weibo-web-session-${Date.now()}`;

  if (!pageUrl || !pageUrl.startsWith('http')) {
    throw new Error('INVALID_IMPORT_PAYLOAD');
  }

  if (comments.length === 0) {
    throw new Error('EMPTY_IMPORT_PAYLOAD');
  }

  const items = comments
    .map((comment, index) => {
      const text = normalizeVisibleCommentText(comment.text);
      const authorName = typeof comment.authorName === 'string' ? comment.authorName.trim() : '';

      if (!text || !authorName) {
        return null;
      }

      const id =
        typeof comment.id === 'string' && comment.id.trim()
          ? comment.id.trim()
          : `${batchId}-${index + 1}`;

      return {
        id: `imported-${id}`,
        platform: 'weibo',
        channel: 'public_comment',
        contentType: 'comment',
        sourceUrl:
          typeof comment.sourceUrl === 'string' && comment.sourceUrl.trim()
            ? comment.sourceUrl.trim()
            : pageUrl,
        contentText: text,
        authorName,
        authorId:
          typeof comment.authorId === 'string' && comment.authorId.trim()
            ? comment.authorId.trim()
            : `visible-author-${index + 1}`,
        publishTime:
          typeof comment.publishTime === 'string' && comment.publishTime.trim()
            ? comment.publishTime.trim()
            : importedAt,
        collectedAt: importedAt,
        tags: ['微博', '网页会话导入'],
        riskSignals: [],
        moderationStatus: 'pending',
        moderationReason: undefined,
        reviewTrace: [
          {
            step: 'web_session_import',
            detail: '由授权用户在自己的浏览器中手动导入当前页已可见微博评论',
            createdAt: importedAt,
          },
        ],
        attachments: [],
        platformMetadata: {
          sourceMode: 'web_session_import',
          ingestionChannel: 'public_comment',
          ingestionLabel: '微博网页评论导入',
          pageTitle,
          pageUrl,
          importedBy: currentUser.user.email,
          importedByNickname: currentUser.user.nickname,
          batchId,
        },
      };
    })
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error('EMPTY_IMPORT_PAYLOAD');
  }

  return {
    batchId,
    items,
  };
}

async function handleLogin(request, response) {
  const body = await readJsonBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const remember = Boolean(body.remember);

  if (!validateEmail(email) || typeof password !== 'string' || password.length === 0) {
    sendJson(response, 400, { message: '请求未成功，请检查输入后重试' });
    return;
  }

  const userRecord = userStore.findByEmail(email);
  const validPassword = userRecord ? await verifyPassword(password, userRecord.passwordHash) : false;

  if (!userRecord || !validPassword || userRecord.status !== 'active') {
    logEvent('auth_failure', { email, reason: 'invalid_credentials' });
    sendJson(response, 401, { message: '邮箱或密码不正确' });
    return;
  }

  const session = sessionStore.create(userRecord.id, remember);
  const user = userStore.toPublicUser(userRecord);

  logEvent('login', { email, role: user.role, plan: user.plan });
  sendJson(
    response,
    200,
    {
      user,
      expiresAt: new Date(session.expiresAt).toISOString(),
      authProvider: 'password',
      sessionStatus: 'authenticated',
    },
    {
      'Set-Cookie': buildCookie(session.id, session.expiresAt),
    },
  );
}

async function handleRegister(request, response) {
  if (!serverConfig.allowRegister) {
    sendJson(response, 403, { message: '当前环境未开放注册能力' });
    return;
  }

  const body = await readJsonBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const nickname = String(body.nickname || '').trim();
  const password = String(body.password || '');

  if (!validateEmail(email) || !validateNickname(nickname) || !validatePassword(password)) {
    sendJson(response, 400, { message: '注册未成功，请检查输入后重试' });
    return;
  }

  if (userStore.findByEmail(email)) {
    logEvent('register_failure', { email, reason: 'duplicate' });
    sendJson(response, 400, { message: '注册未成功，请稍后重试' });
    return;
  }

  const passwordHash = await hashPassword(password);
  await userStore.create({
    email,
    nickname,
    passwordHash,
  });

  logEvent('register', { email });
  sendJson(response, 200, { success: true });
}

function handleLogout(request, response) {
  const cookies = parseCookies(request);
  sessionStore.delete(cookies[serverConfig.sessionCookieName]);

  sendJson(
    response,
    200,
    { success: true },
    {
      'Set-Cookie': buildExpiredCookie(),
    },
  );
}

function handleMe(request, response) {
  const current = getCurrentUser(request);
  if (!current) {
    sendJson(
      response,
      401,
      { message: '登录状态已失效，请重新登录' },
      {
        'Set-Cookie': buildExpiredCookie(),
      },
    );
    return;
  }

  sendJson(response, 200, { user: current.user });
}

function handleForgotPassword(_request, response) {
  sendJson(response, 200, { success: true });
}

async function handleWeiboWebSessionImport(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const body = await readJsonBody(request);
  const normalized = toImportedWeiboCommentItems(body, current);
  importStore.saveBatch(normalized.items);

  logEvent('weibo_web_comment_import', {
    email: current.user.email,
    count: normalized.items.length,
    batchId: normalized.batchId,
  });

  sendJson(response, 200, {
    success: true,
    importedCount: normalized.items.length,
    batchId: normalized.batchId,
    items: normalized.items,
  });
}

function handleImportedSubmissions(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  sendJson(response, 200, {
    items: importStore.listItems(),
  });
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (!origin || origin !== serverConfig.allowedOrigin) {
    return;
  }

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

async function createServer() {
  await userStore.initialize();

  const server = http.createServer(async (request, response) => {
    setCorsHeaders(request, response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      if (request.method === 'GET' && request.url === '/health') {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'POST' && request.url === '/auth/login') {
        await handleLogin(request, response);
        return;
      }

      if (request.method === 'POST' && request.url === '/auth/register') {
        await handleRegister(request, response);
        return;
      }

      if (request.method === 'POST' && request.url === '/auth/logout') {
        handleLogout(request, response);
        return;
      }

      if (request.method === 'GET' && request.url === '/auth/me') {
        handleMe(request, response);
        return;
      }

      if (request.method === 'POST' && request.url === '/auth/forgot-password') {
        handleForgotPassword(request, response);
        return;
      }

      if (request.method === 'POST' && request.url === '/imports/weibo/web-session-comments') {
        await handleWeiboWebSessionImport(request, response);
        return;
      }

      if (request.method === 'GET' && request.url === '/imports/submissions') {
        handleImportedSubmissions(request, response);
        return;
      }

      sendJson(response, 404, { message: 'Not Found' });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_JSON') {
        sendJson(response, 400, { message: '请求体格式不正确' });
        return;
      }

      if (error instanceof Error && error.message === 'INVALID_IMPORT_PAYLOAD') {
        sendJson(response, 400, { message: '微博网页评论导入数据格式不正确' });
        return;
      }

      if (error instanceof Error && error.message === 'EMPTY_IMPORT_PAYLOAD') {
        sendJson(response, 400, { message: '未检测到可导入的微博评论' });
        return;
      }

      console.error('[auth-server] unexpected_error', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      sendJson(response, 500, { message: '服务暂时不可用，请稍后重试' });
    }
  });

  server.listen(serverConfig.port, serverConfig.host, () => {
    console.info(`[auth-server] listening on http://${serverConfig.host}:${serverConfig.port}`);
    console.info(`[auth-server] register enabled: ${String(serverConfig.allowRegister)}`);
  });
}

createServer();
