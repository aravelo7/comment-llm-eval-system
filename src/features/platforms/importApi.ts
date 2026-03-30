import { requestJson } from '../auth/http';
import type { UnifiedContentItem } from './types';

export type WeiboWebCommentImportRecord = {
  id: string;
  text: string;
  authorName: string;
  authorId?: string;
  publishTime?: string;
  sourceUrl?: string;
};

export type WeiboWebCommentImportPayload = {
  pageUrl: string;
  pageTitle?: string;
  importedAt?: string;
  comments: WeiboWebCommentImportRecord[];
};

export type ImportedSubmissionsResponse = {
  items: UnifiedContentItem[];
};

export type WeiboImportResponse = {
  success: true;
  importedCount: number;
  batchId: string;
  items: UnifiedContentItem[];
};

export async function importWeiboWebComments(payload: WeiboWebCommentImportPayload) {
  return requestJson<WeiboImportResponse>('/imports/weibo/web-session-comments', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function fetchImportedSubmissions() {
  return requestJson<ImportedSubmissionsResponse>('/imports/submissions', {
    method: 'GET',
  });
}
