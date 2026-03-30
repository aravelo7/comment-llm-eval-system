import type { ReviewStatus, RiskLevel } from '../../types/submission';

export type PlatformKey = 'weibo' | 'douban' | 'tieba';
export type PlatformChannel = 'public_comment' | 'private_message';
export type PlatformSourceMode =
  | 'mock'
  | 'api'
  | 'official_api'
  | 'manual_import'
  | 'web_session_import';
export type ContentType =
  | 'post'
  | 'comment'
  | 'reply'
  | 'thread_reply'
  | 'short_review'
  | 'long_review'
  | 'group_reply'
  | 'dm_message'
  | 'conversation_message';

export type MessageDirection = 'inbound' | 'outbound';

export type RiskSignal =
  | 'external_link'
  | 'contact_info'
  | 'ad_drainage'
  | 'template_spam'
  | 'phishing_hint'
  | 'mass_messaging'
  | 'emotional_provocation'
  | 'thread_bumping'
  | 'role_spoofing'
  | 'instruction_override'
  | 'sensitive_private_message';

export type ReviewTraceItem = {
  step: string;
  detail: string;
  createdAt: string;
};

export type AttachmentItem = {
  id: string;
  type: 'image' | 'link' | 'file';
  name: string;
  url?: string;
};

export type UnifiedContentItem = {
  id: string;
  platform: PlatformKey;
  channel: PlatformChannel;
  contentType: ContentType;
  sourceUrl?: string;
  contentText: string;
  contentHtml?: string;
  authorName: string;
  authorId?: string;
  targetAuthorName?: string;
  targetAuthorId?: string;
  publishTime: string;
  collectedAt: string;
  tags: string[];
  riskSignals: RiskSignal[];
  moderationStatus: ReviewStatus;
  moderationReason?: string;
  reviewTrace: ReviewTraceItem[];
  attachments: AttachmentItem[];
  platformMetadata: Record<string, unknown>;
  threadId?: string;
  postId?: string;
  commentId?: string;
  parentId?: string;
  conversationId?: string;
  messageId?: string;
  direction?: MessageDirection;
  receiverId?: string;
  receiverName?: string;
  isFirstContact?: boolean;
};

export type PlatformFieldDefinition = {
  key: string;
  label: string;
  mask?: 'partial';
};

export type PlatformDisplayField = {
  label: string;
  value: string;
};

export type PlatformConnectionField = {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'select' | 'readonly';
  options?: Array<{ label: string; value: string }>;
};

export type PlatformIntegrationStatus = 'enabled' | 'disabled' | 'warning';
export type PlatformAuthStatus =
  | 'configured'
  | 'missing'
  | 'backend_only'
  | 'authorized'
  | 'expired'
  | 'manual_only';
export type PlatformCapabilityStatus =
  | 'available'
  | 'official_permission_required'
  | 'manual_import_only'
  | 'unsupported';

export type PlatformAuthorizationSummary = {
  status: PlatformAuthStatus;
  accountLabel?: string;
  grantedScopes?: string[];
  authorizedAt?: string;
  expiresAt?: string;
  statusMessage: string;
};

export type PlatformChannelAccessPlan = {
  channel: PlatformChannel;
  sourceMode: Extract<
    PlatformSourceMode,
    'official_api' | 'manual_import' | 'api' | 'mock' | 'web_session_import'
  >;
  capabilityStatus: PlatformCapabilityStatus;
  notes: string;
};

export type PlatformIntegrationConfig = {
  platform: PlatformKey;
  displayName: string;
  status: PlatformIntegrationStatus;
  mode: PlatformSourceMode;
  supportedChannels: PlatformChannel[];
  lastSyncedAt?: string;
  riskNotice: string;
  enabled: boolean;
  authStatus: PlatformAuthStatus;
  rateLimitStatus: 'healthy' | 'watch' | 'unknown';
  authorization?: PlatformAuthorizationSummary;
  channelAccess?: PlatformChannelAccessPlan[];
};

export type AdapterRiskHint = {
  title: string;
  description: string;
  severity: RiskLevel;
};
