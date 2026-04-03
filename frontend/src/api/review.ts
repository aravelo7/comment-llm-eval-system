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
  label: string;
  risk_level: 'low' | 'medium' | 'high';
  confidence: number;
  action: 'allow' | 'review' | 'block';
  reason: string;
  evidence: string[];
  needs_human_review: boolean;
  rule_hits: ReviewRuleHit[];
};

export async function runReview(payload: ReviewLabRequest) {
  return requestJson<{ ok: true; result: ReviewLabResult }>('/review/run', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });
}
