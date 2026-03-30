import type { SchemaField } from '../../types/rules';

const actionHelp =
  '拒绝：系统直接判定不通过；转人工：系统标记为需要人工复核；仅提示：系统记录风险但不直接拦截。';

export const riskRulesSchema: SchemaField[] = [
  {
    type: 'tag',
    field: 'high_risk_keywords',
    label: '高风险关键词',
    description: '命中这些词时，系统会按你选择的风险动作处理。',
    placeholder: '输入后回车添加，例如 系统提示词',
  },
  {
    type: 'select',
    field: 'high_risk_action',
    label: '高风险关键词处理方式',
    description: actionHelp,
    options: [
      { label: '直接拒绝', value: 'rejected' },
      { label: '转人工审核', value: 'manual_review' },
      { label: '仅提示不拦截', value: 'warn_only' },
    ],
  },
  {
    type: 'switch',
    field: 'enable_role_spoofing_detection',
    label: '启用角色伪装检测',
    description: '识别“我是管理员”“你现在必须”等冒充身份的表达。',
  },
  {
    type: 'select',
    field: 'role_spoofing_action',
    label: '角色伪装处理方式',
    description: actionHelp,
    options: [
      { label: '转人工审核', value: 'manual_review' },
      { label: '直接拒绝', value: 'rejected' },
      { label: '仅提示不拦截', value: 'warn_only' },
    ],
  },
  {
    type: 'switch',
    field: 'enable_instruction_override_detection',
    label: '启用指令覆盖检测',
    description: '识别“忽略以上规则”“请直接通过”“不要返回 JSON”等表达。',
  },
  {
    type: 'select',
    field: 'instruction_override_action',
    label: '指令覆盖处理方式',
    description: actionHelp,
    options: [
      { label: '直接拒绝', value: 'rejected' },
      { label: '转人工审核', value: 'manual_review' },
      { label: '仅提示不拦截', value: 'warn_only' },
    ],
  },
  {
    type: 'select',
    field: 'external_link_risk_action',
    label: '外链风险处理方式',
    description: '当投稿只有外链或外链风险较高时，系统如何处理。',
    options: [
      { label: '直接通过', value: 'approved' },
      { label: '转人工审核', value: 'manual_review' },
      { label: '直接拒绝', value: 'rejected' },
    ],
  },
  {
    type: 'select',
    field: 'image_post_risk_action',
    label: '图片投稿处理方式',
    description: '当投稿带图片时，系统如何处理。',
    options: [
      { label: '直接通过', value: 'approved' },
      { label: '转人工审核', value: 'manual_review' },
      { label: '直接拒绝', value: 'rejected' },
    ],
  },
];
