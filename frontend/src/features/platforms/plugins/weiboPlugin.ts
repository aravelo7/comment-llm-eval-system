import { createBaseMockItem } from '../mockFactory';
import type {
  PlatformAuthorizationSummary,
  PlatformChannel,
  PlatformChannelAccessPlan,
  UnifiedContentItem,
} from '../types';

type WeiboPluginSourceMode = 'official_api' | 'manual_import' | 'web_session_import';

export type WeiboOAuthConfig = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
};

export type WeiboCommentRecord = {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  publishTime: string;
  sourceUrl: string;
  threadId?: string;
  postId?: string;
  commentId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
};

export type WeiboDirectMessageRecord = {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  publishTime: string;
  conversationId: string;
  messageId: string;
  sourceUrl?: string;
  receiverName?: string;
  receiverId?: string;
  targetAuthorName?: string;
  targetAuthorId?: string;
  direction?: UnifiedContentItem['direction'];
  isFirstContact?: boolean;
  metadata?: Record<string, unknown>;
};

export type WeiboVisibleCommentImportRecord = {
  id: string;
  text: string;
  authorName: string;
  authorId?: string;
  publishTime?: string;
  sourceUrl?: string;
};

export type WeiboVisibleCommentImportPayload = {
  pageUrl: string;
  pageTitle?: string;
  importedAt?: string;
  comments: WeiboVisibleCommentImportRecord[];
};

export type WeiboManualImportRecord = {
  importedAt: string;
  operatorName: string;
  records: WeiboDirectMessageRecord[];
};

export type WeiboNormalizeRequest =
  | {
      channel: 'public_comment';
      sourceMode: 'official_api' | 'web_session_import';
      records: WeiboCommentRecord[];
    }
  | {
      channel: 'private_message';
      sourceMode: WeiboPluginSourceMode;
      records: WeiboDirectMessageRecord[];
      authorization?: PlatformAuthorizationSummary;
    };

export type WeiboNormalizeResult = {
  items: UnifiedContentItem[];
  effectiveSourceMode: WeiboPluginSourceMode;
  warnings: string[];
};

export type WeiboManualImportPlan = {
  channel: 'private_message';
  sourceMode: 'manual_import';
  requiredFields: Array<keyof WeiboDirectMessageRecord>;
  acceptedFormats: string[];
  process: string[];
};

export type WeiboPlugin = {
  pluginId: string;
  displayName: string;
  sourceModes: readonly WeiboPluginSourceMode[];
  channelAccess: PlatformChannelAccessPlan[];
  getAuthorizationUrl(config: WeiboOAuthConfig): string;
  normalize(request: WeiboNormalizeRequest): WeiboNormalizeResult;
  getManualImportPlan(): WeiboManualImportPlan;
  getWebSessionImportGuidance(): string[];
  getChannelSourceMode(
    channel: PlatformChannel,
    authorization?: PlatformAuthorizationSummary,
  ): WeiboPluginSourceMode;
  getWeiboVisibleCommentCollectorScript?: () => string;
};

function normalizeCommentRecord(
  record: WeiboCommentRecord,
  sourceMode: Extract<WeiboPluginSourceMode, 'official_api' | 'web_session_import'>,
) {
  return createBaseMockItem({
    id: record.id,
    platform: 'weibo',
    channel: 'public_comment',
    contentType: 'comment',
    contentText: record.text,
    authorName: record.authorName,
    authorId: record.authorId,
    publishTime: record.publishTime,
    sourceUrl: record.sourceUrl,
    threadId: record.threadId,
    postId: record.postId,
    commentId: record.commentId,
    parentId: record.parentId,
    tags: ['微博', sourceMode === 'official_api' ? '官方 API' : '网页会话导入'],
    platformMetadata: {
      ...record.metadata,
      ingestionChannel: 'public_comment',
      sourceMode,
      ingestionLabel:
        sourceMode === 'official_api' ? '微博官方评论接入' : '微博网页评论导入',
    },
  });
}

function normalizePrivateMessageRecord(
  record: WeiboDirectMessageRecord,
  sourceMode: Extract<WeiboPluginSourceMode, 'official_api' | 'manual_import'>,
) {
  return createBaseMockItem({
    id: record.id,
    platform: 'weibo',
    channel: 'private_message',
    contentType: 'conversation_message',
    contentText: record.text,
    authorName: record.authorName,
    authorId: record.authorId,
    publishTime: record.publishTime,
    sourceUrl: record.sourceUrl,
    targetAuthorName: record.targetAuthorName,
    targetAuthorId: record.targetAuthorId,
    receiverName: record.receiverName,
    receiverId: record.receiverId,
    conversationId: record.conversationId,
    messageId: record.messageId,
    direction: record.direction,
    isFirstContact: record.isFirstContact,
    tags: ['微博', sourceMode === 'official_api' ? '官方 API' : 'Manual Import'],
    platformMetadata: {
      ...record.metadata,
      ingestionChannel: 'private_message',
      sourceMode,
    },
  });
}

function canUseOfficialPrivateMessageAccess(authorization?: PlatformAuthorizationSummary) {
  if (!authorization || authorization.status !== 'authorized') {
    return false;
  }

  return (authorization.grantedScopes || []).includes('direct_message:read');
}

export function getWeiboVisibleCommentCollectorScript() {
  return `(() => {
  const selectors = [
    '[data-testid="comment-item"]',
    '.CommentItem_root',
    '.WB_feed_detail .list_li',
    '.WB_feed_repeat .list_li',
  ];
  const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  const uniqueNodes = Array.from(new Set(nodes)).filter((node) => {
    const el = node;
    return el instanceof HTMLElement && el.offsetParent !== null;
  });

  const comments = uniqueNodes.map((node, index) => {
    const textNode =
      node.querySelector('[data-testid="comment-text"]') ||
      node.querySelector('.text') ||
      node.querySelector('.WB_text');
    const authorNode =
      node.querySelector('[data-testid="comment-author"]') ||
      node.querySelector('.name') ||
      node.querySelector('.WB_text a');
    const timeNode =
      node.querySelector('time') ||
      node.querySelector('.from a') ||
      node.querySelector('.WB_from a');

    const text = (textNode?.textContent || '').trim();
    if (!text) return null;

    return {
      id: node.getAttribute('data-comment-id') || \`visible-comment-\${index + 1}\`,
      text,
      authorName: (authorNode?.textContent || '未知用户').trim(),
      authorId: authorNode?.getAttribute('data-user-id') || '',
      publishTime: (timeNode?.textContent || '').trim(),
      sourceUrl: window.location.href,
    };
  }).filter(Boolean);

  const payload = {
    pageUrl: window.location.href,
    pageTitle: document.title,
    importedAt: new Date().toISOString(),
    comments,
  };

  console.log(JSON.stringify(payload, null, 2));
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  }
})();`;
}

export const weiboPlugin: WeiboPlugin = {
  pluginId: 'weibo-official-access',
  displayName: 'WeiboPlugin',
  sourceModes: ['official_api', 'manual_import', 'web_session_import'] as const,
  channelAccess: [
    {
      channel: 'public_comment',
      sourceMode: 'official_api',
      capabilityStatus: 'available',
      notes: '评论区优先走官方 OAuth 与官方 API，也允许用户在自己的浏览器中手动导入当前页可见评论。',
    },
    {
      channel: 'private_message',
      sourceMode: 'manual_import',
      capabilityStatus: 'official_permission_required',
      notes: '私信仅在官方权限明确开放时自动接入，否则退化为 manual import。',
    },
  ] satisfies PlatformChannelAccessPlan[],
  getAuthorizationUrl(config: WeiboOAuthConfig) {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: config.state,
    });

    return `https://api.weibo.com/oauth2/authorize?${params.toString()}`;
  },
  normalize(request: WeiboNormalizeRequest): WeiboNormalizeResult {
    if (request.channel === 'public_comment') {
      return {
        items: request.records.map((record) => normalizeCommentRecord(record, request.sourceMode)),
        effectiveSourceMode: request.sourceMode,
        warnings:
          request.sourceMode === 'web_session_import'
            ? ['微博网页评论导入仅包含用户当前页面已可见评论，不代表完整评论集。']
            : [],
      };
    }

    if (request.sourceMode === 'official_api' && canUseOfficialPrivateMessageAccess(request.authorization)) {
      return {
        items: request.records.map((record) => normalizePrivateMessageRecord(record, 'official_api')),
        effectiveSourceMode: 'official_api',
        warnings: [],
      };
    }

    return {
      items: request.records.map((record) => normalizePrivateMessageRecord(record, 'manual_import')),
      effectiveSourceMode: 'manual_import',
      warnings: ['微博私信未检测到官方直连权限，已退化为 manual import。'],
    };
  },
  getManualImportPlan(): WeiboManualImportPlan {
    return {
      channel: 'private_message',
      sourceMode: 'manual_import',
      requiredFields: [
        'id',
        'text',
        'authorName',
        'authorId',
        'publishTime',
        'conversationId',
        'messageId',
      ],
      acceptedFormats: ['csv', 'jsonl', 'xlsx'],
      process: [
        '由用户在微博官方允许的导出、开放平台回调或合规后台工具中获取私信数据。',
        '导入前由运营人员确认数据范围、时间窗口和授权主体。',
        '后端完成脱敏、字段校验与审计记录后，再进入统一归一化接口。',
      ],
    };
  },
  getWebSessionImportGuidance() {
    return [
      '在你自己的浏览器中打开微博评论页，并确保目标评论已经出现在当前视口或页面 DOM 中。',
      '按 F12 打开开发者工具，在 Console 粘贴采集脚本并执行。',
      '把输出的 JSON 粘贴回 bot 审稿系统的“导入当前页评论”对话框中提交。',
    ];
  },
  getWeiboVisibleCommentCollectorScript,
  getChannelSourceMode(
    channel: PlatformChannel,
    authorization?: PlatformAuthorizationSummary,
  ): WeiboPluginSourceMode {
    if (channel === 'public_comment') {
      return 'official_api';
    }

    return canUseOfficialPrivateMessageAccess(authorization) ? 'official_api' : 'manual_import';
  },
};
