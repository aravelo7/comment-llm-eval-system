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

export type ManualImportConsentPayload = {
  statements: {
    confirmAuthorizedData: boolean;
    agreeManualImport: boolean;
    acknowledgeDesensitization: boolean;
  };
};

export type ManualImportConsentRecord = {
  id: string;
  userId: string;
  scope: 'weibo_manual_import';
  statements: ManualImportConsentPayload['statements'];
  createdAt: string;
};

export type WeiboManualImportPayload = {
  consentId: string;
  fileName: string;
  fileType: 'json' | 'csv';
  fileContent: string;
};

export type ReviewDecision = 'approve' | 'rejected' | 'manual_review';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ImportJobRecord = {
  id: string;
  platform: 'weibo';
  source: 'manual_import';
  channel: 'private_message';
  fileName: string;
  fileType: 'json' | 'csv';
  status: ImportJobStatus;
  reviewStatus: 'pending' | 'completed';
  totalMessages: number;
  successCount: number;
  failedCount: number;
  conversationCount: number;
  messageCount: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  importedAt: string;
  completedAt: string | null;
  errorSummary: string | null;
  reviewSummary: {
    total: number;
    approved: number;
    rejected: number;
    manualReview: number;
  } | null;
};

export type ImportJobsResponse = {
  items: ImportJobRecord[];
};

export type ImportJobDetailResponse = {
  job: ImportJobRecord;
  conversations: Array<{
    id: string;
    importJobId: string;
    conversationId: string;
    peerAlias: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }>;
  auditRecords: Array<{
    id: string;
    action: string;
    status: string;
    createdAt: string;
    detail: Record<string, unknown>;
  }>;
};

export type ReviewResultRecord = {
  id: string;
  jobId: string;
  messageId: string;
  submissionId: string;
  decision: ReviewDecision;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  needsHumanReview: boolean;
  label: string;
  comment: string;
  createdAt: string;
};

export type ReviewResultResponse = {
  items: ReviewResultRecord[];
  summary: ImportJobRecord['reviewSummary'];
};

export type WeiboOauthStatus =
  | 'not_connected'
  | 'connected_no_dm_permission'
  | 'connected_dm_permission_unavailable'
  | 'connected_dm_permission_available'
  | 'oauth_not_configured';

export type WeiboOauthStatusResponse = {
  connected: boolean;
  provider: 'weibo';
  uid: string | null;
  scope: string[];
  hasDirectMessageReadPermission: boolean;
  mode: 'official_api' | 'manual_import';
  fallbackReason: string | null;
  status: WeiboOauthStatus;
  connectedAt: string | null;
  expiresAt: string | null;
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

export async function createManualImportConsent(payload: ManualImportConsentPayload) {
  return requestJson<{ success: true; consent: ManualImportConsentRecord }>('/api/consent', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function importWeiboPrivateMessages(payload: WeiboManualImportPayload) {
  return requestJson<{
    success: true;
    job: ImportJobRecord;
    reviewSummary: ImportJobRecord['reviewSummary'];
  }>('/api/import/weibo', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function fetchImportJobs() {
  return requestJson<ImportJobsResponse>('/api/import/jobs', {
    method: 'GET',
  });
}

export async function fetchImportJobDetail(jobId: string) {
  return requestJson<ImportJobDetailResponse>(`/api/import/jobs/${jobId}`, {
    method: 'GET',
  });
}

export async function fetchImportedMessages(jobId?: string) {
  const path = jobId ? `/api/messages?jobId=${encodeURIComponent(jobId)}` : '/api/messages';
  return requestJson<ImportedSubmissionsResponse>(path, {
    method: 'GET',
  });
}

export async function runImportJobReview(jobId: string) {
  return requestJson<{
    success: true;
    jobId: string;
    summary: NonNullable<ImportJobRecord['reviewSummary']>;
    results: ReviewResultRecord[];
  }>('/api/review/run', {
    method: 'POST',
    body: { jobId },
  });
}

export async function fetchReviewResults(jobId: string) {
  return requestJson<ReviewResultResponse>(`/api/review/results?jobId=${encodeURIComponent(jobId)}`, {
    method: 'GET',
  });
}

export async function deleteImportJob(jobId: string) {
  return requestJson<{ success: true; deletedJobId: string }>(`/api/import/jobs/${jobId}`, {
    method: 'DELETE',
  });
}

export async function fetchWeiboOauthStart() {
  return requestJson<{
    authorizationUrl: string;
    state: string;
    provider: 'weibo';
  }>('/api/weibo/oauth/start', {
    method: 'GET',
  });
}

export async function fetchWeiboOauthStatus() {
  return requestJson<WeiboOauthStatusResponse>('/api/weibo/oauth/status', {
    method: 'GET',
  });
}

export async function disconnectWeiboOauth() {
  return requestJson<{
    success: true;
    status: WeiboOauthStatusResponse;
  }>('/api/weibo/oauth/disconnect', {
    method: 'POST',
  });
}
