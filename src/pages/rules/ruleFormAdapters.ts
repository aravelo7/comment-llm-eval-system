import type { RuleConfig } from '../../types/ruleConfig';
import type { ContentRulesFormValues, RiskRulesFormValues } from '../../types/rules';

export function toContentRulesFormValues(ruleConfig: RuleConfig): ContentRulesFormValues {
  return {
    min_length: ruleConfig.content.min_length,
    max_length: ruleConfig.content.max_length,
    forbidden_keywords: ruleConfig.content.forbidden_keywords,
    drainage_keywords: ruleConfig.content.drainage_keywords,
    contact_keywords: ruleConfig.content.contact_keywords,
    allow_contact_info: ruleConfig.content.allow_contact_info,
    allow_external_links_only: ruleConfig.content.allow_external_links_only,
    allow_image_posts: ruleConfig.content.allow_image_posts,
  };
}

export function toRiskRulesFormValues(ruleConfig: RuleConfig): RiskRulesFormValues {
  return {
    high_risk_keywords: ruleConfig.risk.high_risk_keywords,
    high_risk_action: ruleConfig.risk.high_risk_action,
    enable_role_spoofing_detection: ruleConfig.risk.enable_role_spoofing_detection,
    role_spoofing_action: ruleConfig.risk.role_spoofing_action,
    enable_instruction_override_detection:
      ruleConfig.risk.enable_instruction_override_detection,
    instruction_override_action: ruleConfig.risk.instruction_override_action,
    external_link_risk_action: ruleConfig.risk.external_link_risk_action,
    image_post_risk_action: ruleConfig.risk.image_post_risk_action,
  };
}

export function toRuleContent(values: ContentRulesFormValues): RuleConfig['content'] {
  return {
    forbidden_keywords: values.forbidden_keywords,
    drainage_keywords: values.drainage_keywords,
    contact_keywords: values.contact_keywords,
    min_length: values.min_length,
    max_length: values.max_length,
    allow_links: values.allow_external_links_only,
    allow_images: values.allow_image_posts,
    allow_contact_info: values.allow_contact_info,
    allow_external_links_only: values.allow_external_links_only,
    allow_image_posts: values.allow_image_posts,
  };
}

export function toRuleRisk(values: RiskRulesFormValues): RuleConfig['risk'] {
  return {
    high_risk_keywords: values.high_risk_keywords,
    high_risk_action: values.high_risk_action,
    enable_role_spoofing_detection: values.enable_role_spoofing_detection,
    role_spoofing_action: values.role_spoofing_action,
    enable_instruction_override_detection: values.enable_instruction_override_detection,
    instruction_override_action: values.instruction_override_action,
    external_link_risk_action: values.external_link_risk_action,
    image_post_risk_action: values.image_post_risk_action,
  };
}
