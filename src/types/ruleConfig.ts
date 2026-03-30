import type { PlatformChannel, PlatformKey, ContentType } from '../features/platforms/types';

export type RiskAction = 'rejected' | 'manual_review' | 'warn_only';
export type RiskDecisionAction = 'approved' | 'manual_review' | 'rejected';
export type RuleScopePlatform = 'all' | PlatformKey;
export type RuleScopeChannel = 'all' | PlatformChannel;

export type ScopedRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  platformScope: RuleScopePlatform;
  channelScope: RuleScopeChannel;
  contentTypeScope?: ContentType[];
  keywords: string[];
  action: RiskDecisionAction;
  riskLevel: 'low' | 'medium' | 'high';
};

export interface RuleConfig {
  content: {
    min_length: number;
    max_length: number;
    forbidden_keywords: string[];
    contact_keywords: string[];
    drainage_keywords: string[];
    allow_contact_info: boolean;
    allow_external_links_only: boolean;
    allow_image_posts: boolean;
    allow_links: boolean;
    allow_images: boolean;
  };
  risk: {
    high_risk_keywords: string[];
    high_risk_action: RiskAction;
    enable_role_spoofing_detection: boolean;
    role_spoofing_action: RiskAction;
    enable_instruction_override_detection: boolean;
    instruction_override_action: RiskAction;
    external_link_risk_action: RiskDecisionAction;
    image_post_risk_action: RiskDecisionAction;
  };
  scopedRules: ScopedRule[];
}
