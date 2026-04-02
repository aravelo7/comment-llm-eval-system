import crypto from 'node:crypto';
import http from 'node:http';

import { verifyPassword, hashPassword } from './auth/password.js';
import { SessionStore } from './auth/sessions.js';
import { UserStore } from './auth/users.js';
import { serverConfig } from './config.js';
import { ImportStore } from './imports/store.js';
import { WeiboOAuthStore } from './weiboOAuth/store.js';

const sessionStore = new SessionStore(serverConfig.sessionTtlMs);
const userStore = new UserStore();
const importStore = new ImportStore();
const weiboOAuthStore = new WeiboOAuthStore();

const allowedImportExtensions = new Set(['json', 'csv']);
const requiredConsentStatements = [
  'confirmAuthorizedData',
  'agreeManualImport',
  'acknowledgeDesensitization',
];
const requiredCsvColumns = ['conversation_id', 'msg_id', 'direction', 'sender', 'content', 'time'];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

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
  delete safePayload.fileContent;
  delete safePayload.content;
  delete safePayload.preview;

  console.info(`[auth-server] ${event}`, safePayload);
}

function buildFrontendUrl(pathname, searchParams = new URLSearchParams()) {
  const base = serverConfig.allowedOrigin.replace(/\/$/, '');
  const query = searchParams.toString();
  return `${base}${pathname}${query ? `?${query}` : ''}`;
}

function redirect(response, location) {
  response.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function isWeiboOAuthConfigured() {
  return Boolean(
    serverConfig.weiboOauthEnabled &&
      serverConfig.weiboAppKey &&
      serverConfig.weiboAppSecret &&
      serverConfig.weiboRedirectUri,
  );
}

function getWeiboOauthFallbackReason(connection) {
  if (!serverConfig.weiboOauthEnabled) {
    return 'oauth_disabled';
  }
  if (!serverConfig.weiboAppKey || !serverConfig.weiboAppSecret || !serverConfig.weiboRedirectUri) {
    return 'oauth_not_configured';
  }
  if (!connection) {
    return 'not_connected';
  }
  if (!connection.dmPermission) {
    return 'direct_message_read_not_granted';
  }
  return null;
}

function getWeiboOauthStatusForUser(userId) {
  const connection = weiboOAuthStore.getConnectionByUser(userId);
  const fallbackReason = getWeiboOauthFallbackReason(connection);
  const hasDirectMessageReadPermission = Boolean(connection?.dmPermission);

  return {
    connected: Boolean(connection),
    provider: 'weibo',
    uid: connection?.uid || null,
    scope: Array.isArray(connection?.scope) ? connection.scope : [],
    hasDirectMessageReadPermission,
    mode: hasDirectMessageReadPermission ? 'official_api' : 'manual_import',
    fallbackReason,
    status: !isWeiboOAuthConfigured()
      ? 'oauth_not_configured'
      : !connection
        ? 'not_connected'
        : hasDirectMessageReadPermission
          ? 'connected_dm_permission_available'
          : connection?.scopeCheckedAt
            ? 'connected_dm_permission_unavailable'
            : 'connected_no_dm_permission',
    connectedAt: connection?.connectedAt || null,
    expiresAt: connection?.expiresAt || null,
  };
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

function redactSensitiveText(value) {
  return String(value || '')
    .replace(/\b1[3-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\bhttps?:\/\/[^\s]+/gi, '[LINK]')
    .replace(/\bwww\.[^\s]+/gi, '[LINK]');
}

function buildSenderAlias(input, jobId) {
  const raw = typeof input === 'string' ? input.trim() : '';
  const hash = crypto
    .createHash('sha256')
    .update(`${jobId}:${raw || 'unknown'}`)
    .digest('hex')
    .slice(0, 8);
  return `sender_${hash}`;
}

function inferRiskSignals(content) {
  const signals = ['sensitive_private_message'];
  if (/\[PHONE\]|\[EMAIL\]/.test(content)) {
    signals.push('contact_info');
  }
  if (/\[LINK\]/.test(content)) {
    signals.push('external_link');
  }
  if (/优惠|返现|推广|代发|加微|vx|微信|qq/i.test(content)) {
    signals.push('ad_drainage');
  }
  if (/必须|立刻|马上|现在处理|按我说的做/i.test(content)) {
    signals.push('instruction_override');
  }
  return [...new Set(signals)];
}

function normalizeDateTime(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('INVALID_TIME');
  }

  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : trimmed;
  const timestamp = Date.parse(normalized);

  if (Number.isNaN(timestamp)) {
    throw new Error('INVALID_TIME');
  }

  return new Date(timestamp).toISOString();
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvText(content) {
  const lines = String(content || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('EMPTY_FILE');
  }

  const headers = parseCsvLine(lines[0]);
  const missingColumns = requiredCsvColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`MISSING_CSV_COLUMNS:${missingColumns.join(',')}`);
  }

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    return row;
  });
}

function parseWeiboJsonImport(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('INVALID_IMPORT_JSON');
  }

  if (!parsed || parsed.platform !== 'weibo' || !Array.isArray(parsed.conversations)) {
    throw new Error('INVALID_IMPORT_PAYLOAD');
  }

  return {
    ownerAccount: typeof parsed.owner_account === 'string' ? parsed.owner_account.trim() : '',
    conversations: parsed.conversations.map((conversation) => ({
      conversationId: String(conversation.conversation_id || '').trim(),
      peerName: typeof conversation.peer_name === 'string' ? conversation.peer_name.trim() : '',
      messages: Array.isArray(conversation.messages) ? conversation.messages : [],
    })),
  };
}

function parseWeiboCsvImport(content) {
  const rows = parseCsvText(content);
  const conversationMap = new Map();

  rows.forEach((row) => {
    const conversationId = String(row.conversation_id || '').trim();
    if (!conversationId) {
      throw new Error('INVALID_IMPORT_PAYLOAD');
    }
    if (!conversationMap.has(conversationId)) {
      conversationMap.set(conversationId, {
        conversationId,
        peerName: '',
        messages: [],
      });
    }
    conversationMap.get(conversationId).messages.push({
      msg_id: row.msg_id,
      direction: row.direction,
      sender: row.sender,
      content: row.content,
      time: row.time,
    });
  });

  return {
    ownerAccount: '',
    conversations: Array.from(conversationMap.values()),
  };
}

function getFileExtension(fileName, fileType) {
  const normalizedType = typeof fileType === 'string' ? fileType.trim().toLowerCase() : '';
  if (allowedImportExtensions.has(normalizedType)) {
    return normalizedType;
  }

  const normalizedName = typeof fileName === 'string' ? fileName.trim().toLowerCase() : '';
  const parts = normalizedName.split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function validateConsentStatements(statements) {
  return requiredConsentStatements.every((key) => statements && statements[key] === true);
}

function createAuditRecord(currentUser, action, status, jobId, detail = {}) {
  return {
    id: createId('audit'),
    userId: currentUser.user.id,
    userEmail: currentUser.user.email,
    operatorNickname: currentUser.user.nickname,
    action,
    status,
    jobId,
    createdAt: nowIso(),
    detail,
  };
}

function summarizeJob(job, store) {
  const conversations = store.listConversationsByJob(job.id, job.userId);
  const messages = store.listMessagesByJob(job.id, job.userId);
  const reviewResults = store.listReviewResultsByJob(job.id, job.userId);
  const completedReviews = reviewResults.filter((item) => item.type === 'message_review');

  return {
    ...job,
    conversationCount: conversations.length,
    messageCount: messages.length,
    reviewCount: completedReviews.length,
  };
}

function createReviewResult(message, index) {
  const content = message.content;
  const reasons = [];
  let riskLevel = 'low';
  let decision = 'approve';
  let score = 92;
  let needsHumanReview = false;

  if (/\[PHONE\]|\[EMAIL\]/.test(content)) {
    reasons.push('包含联系方式，需谨慎处理。');
    riskLevel = 'high';
    decision = 'manual_review';
    score = 58;
    needsHumanReview = true;
  }

  if (/\[LINK\]/.test(content)) {
    reasons.push('包含外链信息，建议人工复核来源。');
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    decision = decision === 'approve' ? 'manual_review' : decision;
    score = Math.min(score, 66);
    needsHumanReview = true;
  }

  if (/优惠|返现|推广|代发|兼职|刷单|加微|vx|微信|qq/i.test(content)) {
    reasons.push('命中导流或营销风险关键词。');
    riskLevel = 'high';
    decision = 'rejected';
    score = 28;
    needsHumanReview = false;
  }

  if (/错误|投诉|举报|侵权|违法|事实错误|复核/i.test(content)) {
    reasons.push('包含投诉或争议表达，建议保留审核记录。');
    if (decision === 'approve') {
      riskLevel = 'medium';
      decision = 'manual_review';
      score = Math.min(score, 72);
      needsHumanReview = true;
    }
  }

  if (reasons.length === 0) {
    reasons.push('未命中高风险规则。');
  }

  return {
    id: createId('review'),
    jobId: message.importJobId,
    userId: message.userId,
    messageId: message.messageId,
    submissionId: message.unifiedItem.id,
    type: 'message_review',
    platform: 'weibo',
    source: 'manual_import',
    decision,
    riskLevel,
    score,
    needsHumanReview,
    label:
      decision === 'rejected' ? '导流风险' : decision === 'manual_review' ? '人工复核' : '可通过',
    comment: reasons.join(' '),
    createdAt: nowIso(),
    sortOrder: index,
  };
}

async function runReviewForJob(job, currentUser) {
  const messages = importStore.listMessagesByJob(job.id, currentUser.user.id);
  const reviewResults = messages.map((message, index) => createReviewResult(message, index));
  await importStore.replaceReviewResultsForJob(job.id, reviewResults);

  const successCount = reviewResults.length;
  const failedCount = 0;
  const summary = {
    total: reviewResults.length,
    approved: reviewResults.filter((item) => item.decision === 'approve').length,
    rejected: reviewResults.filter((item) => item.decision === 'rejected').length,
    manualReview: reviewResults.filter((item) => item.decision === 'manual_review').length,
  };

  await importStore.updateJob(job.id, {
    reviewStatus: 'completed',
    reviewCompletedAt: nowIso(),
    reviewSummary: summary,
    successCount,
    failedCount,
  });

  await importStore.appendAuditRecord(
    createAuditRecord(currentUser, 'review_run', 'completed', job.id, {
      reviewedCount: reviewResults.length,
      summary,
    }),
  );

  return {
    jobId: job.id,
    summary,
    results: reviewResults,
  };
}

function toUnifiedMessageItem(message, reviewResult, auditLogs = []) {
  const decision = reviewResult?.decision || 'manual_review';
  const riskLevel = reviewResult?.riskLevel || 'medium';
  const moderationStatus =
    decision === 'approve' ? 'approved' : decision === 'rejected' ? 'rejected' : 'manual_review';

  return {
    ...message.unifiedItem,
    moderationStatus,
    moderationReason: reviewResult?.comment || '待审核',
    reviewTrace: [
      ...message.unifiedItem.reviewTrace,
      {
        step: 'manual_import',
        detail: '用户上传授权导出的微博私信文件，系统完成校验、脱敏与标准化。',
        createdAt: message.createdAt,
      },
      {
        step: 'review_pipeline',
        detail:
          reviewResult?.comment || '已进入共享审核流程，当前批次尚未生成最终审核结果。',
        createdAt: reviewResult?.createdAt || message.createdAt,
      },
    ],
    platformMetadata: {
      ...message.unifiedItem.platformMetadata,
      importJobId: message.importJobId,
      conversationId: message.conversationId,
      manualImportReview: reviewResult
        ? {
            decision: reviewResult.decision,
            riskLevel: reviewResult.riskLevel,
            score: reviewResult.score,
            comment: reviewResult.comment,
            label: reviewResult.label,
            needsHumanReview: reviewResult.needsHumanReview,
          }
        : null,
      auditLogs,
    },
  };
}

function normalizeManualImportDataset(parsed, jobId, currentUser, fileName) {
  const createdAt = nowIso();
  const conversations = [];
  const messages = [];
  let messageIndex = 0;

  parsed.conversations.forEach((conversation, conversationIndex) => {
    const conversationId = String(conversation.conversationId || '').trim();
    if (!conversationId || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
      throw new Error('INVALID_IMPORT_PAYLOAD');
    }

    const peerAlias = buildSenderAlias(conversation.peerName || `peer_${conversationIndex + 1}`, jobId);
    const conversationRecord = {
      id: createId('conv'),
      importJobId: jobId,
      userId: currentUser.user.id,
      platform: 'weibo',
      ownerAccount: parsed.ownerAccount || '',
      conversationId,
      peerAlias,
      createdAt,
      updatedAt: createdAt,
      messageCount: conversation.messages.length,
    };
    conversations.push(conversationRecord);

    conversation.messages.forEach((message) => {
      const messageId = String(message.msg_id || '').trim();
      const direction = String(message.direction || '').trim().toLowerCase();
      const sender = String(message.sender || '').trim();
      const content = normalizeVisibleCommentText(message.content);

      if (!messageId || !sender || !content) {
        throw new Error('INVALID_IMPORT_PAYLOAD');
      }
      if (!['inbound', 'outbound'].includes(direction)) {
        throw new Error('INVALID_DIRECTION');
      }

      const senderAlias = buildSenderAlias(sender, jobId);
      const createdAtIso = normalizeDateTime(message.time);
      const redactedContent = redactSensitiveText(content);
      const riskSignals = inferRiskSignals(redactedContent);
      messageIndex += 1;

      messages.push({
        id: createId('msg'),
        importJobId: jobId,
        userId: currentUser.user.id,
        platform: 'weibo',
        source: 'manual_import',
        conversationId,
        messageId,
        direction,
        senderAlias,
        senderRole: direction === 'outbound' ? 'owner' : 'peer',
        content: redactedContent,
        createdAt: createdAtIso,
        collectedAt: createdAt,
        fileName,
        fileSource: 'manual_import',
        riskSignals,
        unifiedItem: {
          id: `weibo-manual-${jobId}-${messageIndex}`,
          platform: 'weibo',
          channel: 'private_message',
          contentType: 'conversation_message',
          contentText: redactedContent,
          authorName: senderAlias,
          authorId: senderAlias,
          targetAuthorName: direction === 'inbound' ? 'owner_account' : peerAlias,
          targetAuthorId: direction === 'inbound' ? currentUser.user.id : peerAlias,
          publishTime: createdAtIso,
          collectedAt: createdAt,
          tags: ['微博', '私信', 'manual_import'],
          riskSignals,
          moderationStatus: 'pending',
          reviewTrace: [],
          attachments: [],
          platformMetadata: {
            sourceMode: 'manual_import',
            ingestionChannel: 'private_message',
            ingestionLabel: '微博私信授权导入',
            importJobId: jobId,
            ownerAccount: parsed.ownerAccount || '',
            importedBy: currentUser.user.email,
          },
          conversationId,
          messageId,
          direction,
          receiverName: direction === 'inbound' ? currentUser.user.nickname : peerAlias,
          receiverId: direction === 'inbound' ? currentUser.user.id : peerAlias,
          isFirstContact: false,
        },
      });
    });
  });

  if (messages.length === 0) {
    throw new Error('EMPTY_IMPORT_PAYLOAD');
  }

  return { conversations, messages };
}

function toImportedWeiboCommentItems(payload, currentUser) {
  const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl.trim() : '';
  const pageTitle = typeof payload.pageTitle === 'string' ? payload.pageTitle.trim() : '';
  const importedAt = typeof payload.importedAt === 'string' ? payload.importedAt : nowIso();
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
            detail: '由授权用户在自己的浏览器中手动导入当前页已可见微博评论。',
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

async function exchangeWeiboAccessToken(code) {
  const body = new URLSearchParams({
    client_id: serverConfig.weiboAppKey,
    client_secret: serverConfig.weiboAppSecret,
    grant_type: 'authorization_code',
    redirect_uri: serverConfig.weiboRedirectUri,
    code,
  });

  const tokenResponse = await fetch('https://api.weibo.com/oauth2/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  let payload = {};
  try {
    payload = await tokenResponse.json();
  } catch {
    throw new Error('WEIBO_TOKEN_EXCHANGE_FAILED');
  }

  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error('WEIBO_TOKEN_EXCHANGE_FAILED');
  }

  return payload;
}

async function handleWeiboOauthStart(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  if (!isWeiboOAuthConfigured()) {
    sendJson(response, 400, {
      message: '微博官方 OAuth 未配置，当前仅可使用 manual_import',
      code: 'WEIBO_OAUTH_NOT_CONFIGURED',
      status: getWeiboOauthStatusForUser(current.user.id),
    });
    return;
  }

  const state = createId('weibo_state');
  await weiboOAuthStore.savePendingState({
    state,
    userId: current.user.id,
    createdAt: nowIso(),
  });

  const authorizationUrl = new URL('https://api.weibo.com/oauth2/authorize');
  authorizationUrl.searchParams.set('client_id', serverConfig.weiboAppKey);
  authorizationUrl.searchParams.set('redirect_uri', serverConfig.weiboRedirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('state', state);

  logEvent('weibo_oauth_start', {
    email: current.user.email,
    stateId: state,
  });

  sendJson(response, 200, {
    authorizationUrl: authorizationUrl.toString(),
    state,
    provider: 'weibo',
  });
}

async function handleWeiboOauthCallback(request, response, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!isWeiboOAuthConfigured()) {
    const redirectUrl = buildFrontendUrl(
      '/imports/weibo/manual',
      new URLSearchParams({
        oauth: 'oauth_not_configured',
      }),
    );
    redirect(response, redirectUrl);
    return;
  }

  if (!code || !state) {
    const redirectUrl = buildFrontendUrl(
      '/imports/weibo/manual',
      new URLSearchParams({
        oauth: 'invalid_callback',
      }),
    );
    redirect(response, redirectUrl);
    return;
  }

  const pendingState = await weiboOAuthStore.consumePendingState(state);
  if (!pendingState) {
    const redirectUrl = buildFrontendUrl(
      '/imports/weibo/manual',
      new URLSearchParams({
        oauth: 'invalid_state',
      }),
    );
    redirect(response, redirectUrl);
    return;
  }

  const user = userStore.findById(pendingState.userId);
  if (!user || user.status !== 'active') {
    const redirectUrl = buildFrontendUrl(
      '/imports/weibo/manual',
      new URLSearchParams({
        oauth: 'user_not_found',
      }),
    );
    redirect(response, redirectUrl);
    return;
  }

  try {
    const tokenPayload = await exchangeWeiboAccessToken(code);
    const scope = typeof tokenPayload.scope === 'string'
      ? tokenPayload.scope
          .split(/[,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
    const expiresInSeconds = Number(tokenPayload.expires_in || 0);
    const expiresAt = expiresInSeconds > 0
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : null;
    const dmPermission = scope.includes('direct_message:read');

    await weiboOAuthStore.saveConnection({
      userId: pendingState.userId,
      provider: 'weibo',
      uid: String(tokenPayload.uid || ''),
      accessToken: String(tokenPayload.access_token || ''),
      expiresAt,
      scope,
      connectedAt: nowIso(),
      scopeCheckedAt: nowIso(),
      dmPermission,
    });

    logEvent('weibo_oauth_callback', {
      email: user.email,
      uid: String(tokenPayload.uid || ''),
      hasDirectMessageReadPermission: dmPermission,
    });

    const redirectUrl = buildFrontendUrl(
      '/imports/weibo/manual',
      new URLSearchParams({
        oauth: 'connected',
      }),
    );
    redirect(response, redirectUrl);
  } catch {
    const redirectUrl = buildFrontendUrl(
      '/imports/weibo/manual',
      new URLSearchParams({
        oauth: 'exchange_failed',
      }),
    );
    redirect(response, redirectUrl);
  }
}

function handleWeiboOauthStatus(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  sendJson(response, 200, getWeiboOauthStatusForUser(current.user.id));
}

async function handleWeiboOauthDisconnect(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  await weiboOAuthStore.deleteConnectionByUser(current.user.id, 'weibo');
  logEvent('weibo_oauth_disconnect', {
    email: current.user.email,
  });

  sendJson(response, 200, {
    success: true,
    status: getWeiboOauthStatusForUser(current.user.id),
  });
}

async function handleConsentCreate(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const body = await readJsonBody(request);
  const statements = body.statements && typeof body.statements === 'object' ? body.statements : {};

  if (!validateConsentStatements(statements)) {
    sendJson(response, 400, { message: '请先完整确认授权声明后再继续导入' });
    return;
  }

  const consent = {
    id: createId('consent'),
    userId: current.user.id,
    scope: 'weibo_manual_import',
    statements: requiredConsentStatements.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}),
    createdAt: nowIso(),
  };

  await importStore.createConsent(consent);
  await importStore.appendAuditRecord(
    createAuditRecord(current, 'consent_confirmed', 'completed', null, {
      scope: consent.scope,
    }),
  );

  sendJson(response, 200, { success: true, consent });
}

async function handleWeiboManualImport(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const body = await readJsonBody(request);
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const fileType = typeof body.fileType === 'string' ? body.fileType.trim() : '';
  const fileContent = typeof body.fileContent === 'string' ? body.fileContent : '';
  const consentId = typeof body.consentId === 'string' ? body.consentId.trim() : '';
  const extension = getFileExtension(fileName, fileType);

  if (!consentId) {
    sendJson(response, 400, { message: '未找到当前导入对应的授权确认记录' });
    return;
  }

  const consent = importStore.findConsentById(consentId);
  if (!consent || consent.userId !== current.user.id) {
    sendJson(response, 400, { message: '授权记录不存在或已失效，请重新确认授权' });
    return;
  }

  if (!fileName || !allowedImportExtensions.has(extension)) {
    sendJson(response, 400, { message: '仅支持上传 .json 或 .csv 私信导出文件' });
    return;
  }

  if (!fileContent.trim()) {
    sendJson(response, 400, { message: '上传文件为空，请重新选择导出文件' });
    return;
  }

  const jobId = createId('job');
  const createdAt = nowIso();
  const job = {
    id: jobId,
    userId: current.user.id,
    platform: 'weibo',
    source: 'manual_import',
    channel: 'private_message',
    consentId,
    fileName,
    fileType: extension,
    status: 'processing',
    reviewStatus: 'pending',
    totalMessages: 0,
    successCount: 0,
    failedCount: 0,
    createdAt,
    updatedAt: createdAt,
    importedAt: createdAt,
    completedAt: null,
    errorSummary: null,
    reviewSummary: null,
  };

  await importStore.createJob(job);
  await importStore.appendAuditRecord(
    createAuditRecord(current, 'data_import', 'processing', jobId, {
      fileName,
      fileType: extension,
    }),
  );

  try {
    const parsed = extension === 'json' ? parseWeiboJsonImport(fileContent) : parseWeiboCsvImport(fileContent);
    const normalized = normalizeManualImportDataset(parsed, jobId, current, fileName);

    await importStore.replaceMessagesForJob(jobId, normalized.messages, normalized.conversations);
    await importStore.updateJob(jobId, {
      status: 'completed',
      totalMessages: normalized.messages.length,
      successCount: normalized.messages.length,
      failedCount: 0,
      conversationCount: normalized.conversations.length,
      updatedAt: nowIso(),
      completedAt: nowIso(),
    });

    await importStore.appendAuditRecord(
      createAuditRecord(current, 'data_import', 'completed', jobId, {
        fileName,
        importedCount: normalized.messages.length,
        conversationCount: normalized.conversations.length,
      }),
    );

    const reviewed = await runReviewForJob(job, current);
    const storedJob = importStore.getJobById(jobId);

    logEvent('weibo_manual_import', {
      email: current.user.email,
      batchId: jobId,
      fileName,
      importedCount: normalized.messages.length,
      status: storedJob?.status || 'completed',
    });

    sendJson(response, 200, {
      success: true,
      job: summarizeJob(storedJob, importStore),
      reviewSummary: reviewed.summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.startsWith('MISSING_CSV_COLUMNS:')
          ? `CSV 缺少必需列：${error.message.split(':')[1]}`
          : error.message
        : 'UNKNOWN_IMPORT_ERROR';
    await importStore.updateJob(jobId, {
      status: 'failed',
      updatedAt: nowIso(),
      errorSummary: message,
    });
    await importStore.appendAuditRecord(
      createAuditRecord(current, 'data_import', 'failed', jobId, {
        fileName,
        errorSummary: message,
      }),
    );
    throw error;
  }
}

async function handleReviewRun(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const body = await readJsonBody(request);
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
  const job = importStore.getJobById(jobId);

  if (!job || job.userId !== current.user.id) {
    sendJson(response, 404, { message: '未找到对应导入批次' });
    return;
  }

  const result = await runReviewForJob(job, current);
  sendJson(response, 200, { success: true, ...result });
}

function handleImportJobs(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const jobs = importStore
    .listJobsByUser(current.user.id)
    .map((job) => summarizeJob(job, importStore));
  sendJson(response, 200, { items: jobs });
}

function handleImportJobDetail(request, response, jobId) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const job = importStore.getJobById(jobId);
  if (!job || job.userId !== current.user.id) {
    sendJson(response, 404, { message: '未找到对应导入任务' });
    return;
  }

  sendJson(response, 200, {
    job: summarizeJob(job, importStore),
    conversations: importStore.listConversationsByJob(jobId, current.user.id),
    auditRecords: importStore.listAuditRecordsByJob(jobId, current.user.id),
  });
}

function handleMessages(request, response, url) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const jobId = url.searchParams.get('jobId');
  const messages = jobId
    ? importStore.listMessagesByJob(jobId, current.user.id)
    : importStore.listMessagesByUser(current.user.id);

  const items = messages.map((message) => {
    const reviewResult = importStore
      .listReviewResultsByJob(message.importJobId, current.user.id)
      .find((item) => item.messageId === message.messageId);
    const auditLogs = importStore.listAuditRecordsByJob(message.importJobId, current.user.id);
    return toUnifiedMessageItem(message, reviewResult, auditLogs);
  });

  sendJson(response, 200, { items });
}

function handleReviewResults(request, response, url) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const jobId = url.searchParams.get('jobId');
  if (!jobId) {
    sendJson(response, 400, { message: '缺少 jobId 参数' });
    return;
  }

  const job = importStore.getJobById(jobId);
  if (!job || job.userId !== current.user.id) {
    sendJson(response, 404, { message: '未找到对应导入批次' });
    return;
  }

  sendJson(response, 200, {
    items: importStore.listReviewResultsByJob(jobId, current.user.id),
    summary: job.reviewSummary || null,
  });
}

async function handleDeleteImportJob(request, response, jobId) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const deletedJob = await importStore.deleteJob(jobId, current.user.id);
  if (!deletedJob) {
    sendJson(response, 404, { message: '未找到可删除的导入批次' });
    return;
  }

  await importStore.appendAuditRecord(
    createAuditRecord(current, 'import_delete', 'completed', null, {
      fileName: deletedJob.fileName,
      deletedJobId: jobId,
    }),
  );

  sendJson(response, 200, { success: true, deletedJobId: jobId });
}

async function handleWeiboWebSessionImport(request, response) {
  const current = ensureAuthenticated(request, response);
  if (!current) {
    return;
  }

  const body = await readJsonBody(request);
  const normalized = toImportedWeiboCommentItems(body, current);
  await importStore.saveBatch(normalized.items);

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

  const manualItems = importStore.listMessagesByUser(current.user.id).map((message) => {
    const reviewResult = importStore
      .listReviewResultsByJob(message.importJobId, current.user.id)
      .find((item) => item.messageId === message.messageId);
    const auditLogs = importStore.listAuditRecordsByJob(message.importJobId, current.user.id);
    return toUnifiedMessageItem(message, reviewResult, auditLogs);
  });

  sendJson(response, 200, {
    items: [...manualItems, ...importStore.listItems()],
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
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}

async function createServer() {
  await Promise.all([userStore.initialize(), importStore.initialize(), weiboOAuthStore.initialize()]);

  const server = http.createServer(async (request, response) => {
    setCorsHeaders(request, response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const importJobMatch = url.pathname.match(/^\/api\/import\/jobs\/([^/]+)$/);

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/auth/login') {
        await handleLogin(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/auth/register') {
        await handleRegister(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/auth/logout') {
        handleLogout(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/auth/me') {
        handleMe(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/auth/forgot-password') {
        handleForgotPassword(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/imports/weibo/web-session-comments') {
        await handleWeiboWebSessionImport(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/imports/submissions') {
        handleImportedSubmissions(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/consent') {
        await handleConsentCreate(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/weibo/oauth/start') {
        await handleWeiboOauthStart(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/weibo/oauth/callback') {
        await handleWeiboOauthCallback(request, response, url);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/weibo/oauth/status') {
        handleWeiboOauthStatus(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/weibo/oauth/disconnect') {
        await handleWeiboOauthDisconnect(request, response);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/import/weibo') {
        await handleWeiboManualImport(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/import/jobs') {
        handleImportJobs(request, response);
        return;
      }

      if (importJobMatch && request.method === 'GET') {
        handleImportJobDetail(request, response, importJobMatch[1]);
        return;
      }

      if (importJobMatch && request.method === 'DELETE') {
        await handleDeleteImportJob(request, response, importJobMatch[1]);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/messages') {
        handleMessages(request, response, url);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/review/run') {
        await handleReviewRun(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/review/results') {
        handleReviewResults(request, response, url);
        return;
      }

      sendJson(response, 404, { message: 'Not Found' });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_JSON') {
        sendJson(response, 400, { message: '请求体格式不正确' });
        return;
      }

      if (error instanceof Error && error.message === 'INVALID_IMPORT_PAYLOAD') {
        sendJson(response, 400, { message: '微博私信导入文件结构不合法' });
        return;
      }

      if (error instanceof Error && error.message === 'INVALID_IMPORT_JSON') {
        sendJson(response, 400, { message: 'JSON 文件内容不是合法的导出结构' });
        return;
      }

      if (error instanceof Error && error.message === 'EMPTY_IMPORT_PAYLOAD') {
        sendJson(response, 400, { message: '未检测到可导入的微博私信消息' });
        return;
      }

      if (error instanceof Error && error.message === 'EMPTY_FILE') {
        sendJson(response, 400, { message: '上传文件为空，请重新选择导出文件' });
        return;
      }

      if (error instanceof Error && error.message.startsWith('MISSING_CSV_COLUMNS:')) {
        sendJson(response, 400, {
          message: `CSV 缺少必需列：${error.message.split(':')[1]}`,
        });
        return;
      }

      if (error instanceof Error && error.message === 'INVALID_DIRECTION') {
        sendJson(response, 400, { message: 'direction 仅支持 inbound 或 outbound' });
        return;
      }

      if (error instanceof Error && error.message === 'INVALID_TIME') {
        sendJson(response, 400, { message: '消息时间格式不正确，请使用可解析的时间字符串' });
        return;
      }

      if (error instanceof Error && error.message === 'WEIBO_TOKEN_EXCHANGE_FAILED') {
        sendJson(response, 502, { message: '微博 OAuth token 交换失败' });
        return;
      }

      console.error('[auth-server] unexpected_error', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'unknown',
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
