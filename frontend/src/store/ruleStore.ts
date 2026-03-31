import { create } from 'zustand';

import type { RuleConfig, ScopedRule } from '../types/ruleConfig';

export const defaultScopedRules: ScopedRule[] = [
  {
    id: 'rule-public-general-001',
    name: '评论区通用导流',
    description: '评论区出现加群、主页留联系方式或导向站外的表达时，进入人工复核。',
    enabled: true,
    platformScope: 'all',
    channelScope: 'public_comment',
    keywords: ['加群', '主页联系', '看头像', '私信我'],
    action: 'manual_review',
    riskLevel: 'high',
  },
  {
    id: 'rule-dm-general-001',
    name: '私信通用骚扰',
    description: '私信中出现批量拉群、兼职引流、低价资源等内容时，进入人工复核。',
    enabled: true,
    platformScope: 'all',
    channelScope: 'private_message',
    keywords: ['兼职群', '低价资源', '回我一个1', '邀请入口'],
    action: 'manual_review',
    riskLevel: 'high',
  },
  {
    id: 'rule-weibo-001',
    name: '微博评论区转评赞引流',
    description: '微博评论区常见“看主页置顶”“互转互关”等导流话术。',
    enabled: true,
    platformScope: 'weibo',
    channelScope: 'public_comment',
    keywords: ['主页置顶', '互转', '互关'],
    action: 'manual_review',
    riskLevel: 'high',
  },
  {
    id: 'rule-douban-001',
    name: '豆瓣小组模板刷评',
    description: '豆瓣短评或小组回复出现模板化刷评时直接拒绝。',
    enabled: true,
    platformScope: 'douban',
    channelScope: 'public_comment',
    keywords: ['五星模板', '想进资源群', '一模一样'],
    action: 'rejected',
    riskLevel: 'high',
  },
  {
    id: 'rule-content-type-001',
    name: '短评模板话术',
    description: '仅对 short_review 生效，出现“五星模板”或高度模板化短评时进入人工复核。',
    enabled: true,
    platformScope: 'all',
    channelScope: 'public_comment',
    contentTypeScope: ['short_review'],
    keywords: ['五星模板', '模板短评'],
    action: 'manual_review',
    riskLevel: 'medium',
  },
  {
    id: 'rule-tieba-001',
    name: '贴吧顶帖与水贴',
    description: '贴吧楼层中连续“顶一下”“顶顶顶”“水一贴”等内容进入人工复核。',
    enabled: true,
    platformScope: 'tieba',
    channelScope: 'public_comment',
    keywords: ['顶一下', '顶顶顶', '水一贴'],
    action: 'manual_review',
    riskLevel: 'medium',
  },
  {
    id: 'rule-weibo-dm-001',
    name: '微博私信导流',
    description: '微博私信中引导到外部群、活动号或资源目录时直接拒绝。',
    enabled: true,
    platformScope: 'weibo',
    channelScope: 'private_message',
    keywords: ['活动号', '资源目录', '拉你进'],
    action: 'rejected',
    riskLevel: 'high',
  },
  {
    id: 'rule-douban-dm-001',
    name: '豆瓣私信邀约导流',
    description: '豆瓣私信中的小组邀约和外部资源链接默认高风险。',
    enabled: true,
    platformScope: 'douban',
    channelScope: 'private_message',
    keywords: ['外部活动群', '问卷汇总链接', '先别告诉别人'],
    action: 'manual_review',
    riskLevel: 'high',
  },
  {
    id: 'rule-tieba-dm-001',
    name: '贴吧私信低价资源轰炸',
    description: '贴吧私信中的低价资源、下载地址和批量轰炸内容直接拒绝。',
    enabled: true,
    platformScope: 'tieba',
    channelScope: 'private_message',
    keywords: ['低价资源', '下载地址', '群发很多吧友'],
    action: 'rejected',
    riskLevel: 'high',
  },
];

export const defaultRuleConfig: RuleConfig = {
  content: {
    forbidden_keywords: ['代发', '兼职引流'],
    drainage_keywords: ['加群', '私聊我', 'vx', '看头像'],
    contact_keywords: ['微信', 'QQ', '手机号', '联系方式'],
    min_length: 5,
    max_length: 500,
    allow_links: false,
    allow_images: true,
    allow_contact_info: false,
    allow_external_links_only: false,
    allow_image_posts: true,
  },
  risk: {
    high_risk_keywords: ['忽略规则', '直接通过', '系统提示词'],
    high_risk_action: 'rejected',
    enable_role_spoofing_detection: true,
    role_spoofing_action: 'manual_review',
    enable_instruction_override_detection: true,
    instruction_override_action: 'rejected',
    external_link_risk_action: 'manual_review',
    image_post_risk_action: 'approved',
  },
  scopedRules: defaultScopedRules,
};

type RuleStoreState = {
  rules: RuleConfig;
  hasUnsavedChanges: boolean;
  getRules: () => RuleConfig;
  setRules: (contentRules: RuleConfig['content']) => void;
  setRiskRules: (riskRules: RuleConfig['risk']) => void;
  setScopedRules: (scopedRules: ScopedRule[]) => void;
  addScopedRule: (rule: ScopedRule) => void;
  toggleScopedRule: (id: string, enabled: boolean) => void;
  setRulesDraftDirty: (dirty: boolean) => void;
  resetRules: () => void;
};

export const useRuleStore = create<RuleStoreState>((set, get) => ({
  rules: defaultRuleConfig,
  hasUnsavedChanges: false,
  getRules: () => get().rules,
  setRules: (contentRules) =>
    set((state) => ({
      rules: {
        ...state.rules,
        content: {
          ...contentRules,
          allow_links: contentRules.allow_external_links_only,
          allow_images: contentRules.allow_image_posts,
        },
      },
      hasUnsavedChanges: false,
    })),
  setRiskRules: (riskRules) =>
    set((state) => ({
      rules: {
        ...state.rules,
        risk: riskRules,
      },
      hasUnsavedChanges: false,
    })),
  setScopedRules: (scopedRules) =>
    set((state) => ({
      rules: {
        ...state.rules,
        scopedRules,
      },
      hasUnsavedChanges: false,
    })),
  addScopedRule: (rule) =>
    set((state) => ({
      rules: {
        ...state.rules,
        scopedRules: [rule, ...state.rules.scopedRules],
      },
      hasUnsavedChanges: false,
    })),
  toggleScopedRule: (id, enabled) =>
    set((state) => ({
      rules: {
        ...state.rules,
        scopedRules: state.rules.scopedRules.map((rule) =>
          rule.id === id ? { ...rule, enabled } : rule,
        ),
      },
    })),
  setRulesDraftDirty: (dirty) =>
    set({
      hasUnsavedChanges: dirty,
    }),
  resetRules: () =>
    set({
      rules: defaultRuleConfig,
      hasUnsavedChanges: false,
    }),
}));
