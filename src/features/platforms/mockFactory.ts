import type {
  ContentType,
  PlatformChannel,
  PlatformKey,
  UnifiedContentItem,
} from './types';

type BaseMockRecord = {
  id: string;
  platform: PlatformKey;
  channel: PlatformChannel;
  contentType: ContentType;
  contentText: string;
  contentHtml?: string;
  authorName: string;
  authorId: string;
  publishTime: string;
  tags?: string[];
  riskSignals?: UnifiedContentItem['riskSignals'];
  sourceUrl?: string;
  targetAuthorName?: string;
  targetAuthorId?: string;
  threadId?: string;
  postId?: string;
  commentId?: string;
  parentId?: string;
  conversationId?: string;
  messageId?: string;
  direction?: UnifiedContentItem['direction'];
  receiverId?: string;
  receiverName?: string;
  isFirstContact?: boolean;
  platformMetadata?: Record<string, unknown>;
  attachments?: UnifiedContentItem['attachments'];
};

export function createBaseMockItem(record: BaseMockRecord): UnifiedContentItem {
  return {
    id: record.id,
    platform: record.platform,
    channel: record.channel,
    contentType: record.contentType,
    sourceUrl: record.sourceUrl,
    contentText: record.contentText,
    contentHtml: record.contentHtml,
    authorName: record.authorName,
    authorId: record.authorId,
    targetAuthorName: record.targetAuthorName,
    targetAuthorId: record.targetAuthorId,
    publishTime: record.publishTime,
    collectedAt: '2026-03-27 10:30',
    tags: record.tags || [],
    riskSignals: record.riskSignals || [],
    moderationStatus: 'pending',
    moderationReason: undefined,
    reviewTrace: [],
    attachments: record.attachments || [],
    platformMetadata: record.platformMetadata || {},
    threadId: record.threadId,
    postId: record.postId,
    commentId: record.commentId,
    parentId: record.parentId,
    conversationId: record.conversationId,
    messageId: record.messageId,
    direction: record.direction,
    receiverId: record.receiverId,
    receiverName: record.receiverName,
    isFirstContact: record.isFirstContact,
  };
}
