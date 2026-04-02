import { requestJson } from '../features/auth/http';
import type { AuthUser } from '../features/auth/types';

export type ReviewLabRequest = {
  user: Pick<AuthUser, 'id' | 'email' | 'plan'>;
  submission: {
    id: string;
    content: string;
    platform: string;
    metadata: {
      sourceType: 'frontend_lab' | 'dashboard';
    };
  };
  policy: {
    rawText: string;
  };
};

export type ReviewRuleHit = {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  evidence: string[];
};

export type ReviewLabResult = {
  submission_id: string;
  decision: 'approve' | 'reject' | 'review';
  risk_score: number;
  confidence: number;
  labels: string[];
  reason: string;
  evidence: string[];
  needs_human_review: boolean;
  model_tier: 'free' | 'vip';
  model_name: string;
  rule_hits: ReviewRuleHit[];
};

export async function runReview(payload: ReviewLabRequest) {
  return requestJson<{ ok: true; result: ReviewLabResult }>('/review/run', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}
