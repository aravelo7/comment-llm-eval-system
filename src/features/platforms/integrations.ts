import type { PlatformIntegrationConfig } from './types';
import { weiboPlugin } from './plugins/weiboPlugin';

export const platformIntegrationConfigs: PlatformIntegrationConfig[] = [
  {
    platform: 'weibo',
    displayName: '微博',
    status: 'enabled',
    mode: 'official_api',
    supportedChannels: ['public_comment', 'private_message'],
    lastSyncedAt: '2026-03-27 09:40',
    riskNotice:
      '微博评论区优先走官方 OAuth + 官方 API，也支持用户在自己浏览器里手动导入当前页可见评论；私信只有在官方权限允许时自动接入，否则必须退化为 manual import。',
    enabled: true,
    authStatus: 'authorized',
    rateLimitStatus: 'healthy',
    authorization: {
      status: 'authorized',
      accountLabel: '@bot-review-demo',
      grantedScopes: ['comment:read', 'comment:write'],
      authorizedAt: '2026-03-27 09:15',
      expiresAt: '2026-06-25 09:15',
      statusMessage: '已完成微博官方 OAuth 授权，评论区官方接口可用。',
    },
    channelAccess: weiboPlugin.channelAccess.map((item) =>
      item.channel === 'private_message'
        ? {
            ...item,
            sourceMode: 'manual_import',
            notes: '当前未声明 direct_message:read 官方权限，私信仅允许 manual import。',
          }
        : item,
    ),
  },
  {
    platform: 'douban',
    displayName: '豆瓣',
    status: 'warning',
    mode: 'manual_import',
    supportedChannels: ['public_comment', 'private_message'],
    lastSyncedAt: '2026-03-27 08:25',
    riskNotice: '评论区支持手工导入，私信接入需单独授权和最小化采集。',
    enabled: true,
    authStatus: 'backend_only',
    rateLimitStatus: 'watch',
  },
  {
    platform: 'tieba',
    displayName: '贴吧',
    status: 'disabled',
    mode: 'api',
    supportedChannels: ['public_comment', 'private_message'],
    lastSyncedAt: undefined,
    riskNotice: '当前仅保留接口占位，前端不保存任何真实凭证。',
    enabled: false,
    authStatus: 'missing',
    rateLimitStatus: 'unknown',
  },
];
