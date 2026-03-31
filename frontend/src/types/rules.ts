import type { RiskAction, RiskDecisionAction } from './ruleConfig';

export type SchemaFieldType =
  | 'input'
  | 'number'
  | 'switch'
  | 'tag'
  | 'textarea'
  | 'select';

export type SchemaOption = {
  label: string;
  value: string;
};

export type SchemaField = {
  type: SchemaFieldType;
  field: string;
  label: string;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: SchemaOption[];
};

export type ContentRulesFormValues = {
  min_length: number;
  max_length: number;
  forbidden_keywords: string[];
  drainage_keywords: string[];
  contact_keywords: string[];
  allow_contact_info: boolean;
  allow_external_links_only: boolean;
  allow_image_posts: boolean;
};

export type RiskRulesFormValues = {
  high_risk_keywords: string[];
  high_risk_action: RiskAction;
  enable_role_spoofing_detection: boolean;
  role_spoofing_action: RiskAction;
  enable_instruction_override_detection: boolean;
  instruction_override_action: RiskAction;
  external_link_risk_action: RiskDecisionAction;
  image_post_risk_action: RiskDecisionAction;
};

export type ExampleAdjustmentSuggestion<TValues extends object = Record<string, unknown>> = {
  title: string;
  description: string;
  applyLabel: string;
  apply: (values: TValues) => Partial<TValues>;
};
