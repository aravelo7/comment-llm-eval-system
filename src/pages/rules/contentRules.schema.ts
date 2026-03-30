import type { SchemaField } from '../../types/rules';

export const contentRulesSchema: SchemaField[] = [
  {
    type: 'number',
    field: 'min_length',
    label: '最小正文长度',
    description: '正文少于这个长度时，系统会认为内容过短。',
    placeholder: '例如 5',
    min: 0,
  },
  {
    type: 'number',
    field: 'max_length',
    label: '最大正文长度',
    description: '正文过长时会转人工确认，避免超长内容直接通过。',
    placeholder: '例如 500',
    min: 1,
  },
  {
    type: 'tag',
    field: 'forbidden_keywords',
    label: '禁止关键词',
    description: '出现这些词时，系统会直接拒绝投稿。',
    placeholder: '输入后回车添加，例如 代发',
  },
  {
    type: 'switch',
    field: 'allow_contact_info',
    label: '是否允许出现联系方式',
    description: '关闭后，正文里出现微信、QQ、手机号等内容会转人工审核。',
  },
  {
    type: 'switch',
    field: 'allow_external_links_only',
    label: '是否允许纯外链投稿',
    description: '关闭后，只有链接、没有正文说明的投稿会进入人工审核。',
  },
  {
    type: 'switch',
    field: 'allow_image_posts',
    label: '是否允许图片类投稿',
    description: '关闭后，带图片的投稿会进入人工审核。',
  },
  {
    type: 'tag',
    field: 'drainage_keywords',
    label: '导流关键词',
    description: '出现这些词时，系统会提示存在导流风险并转人工审核。',
    placeholder: '输入后回车添加，例如 加群',
  },
  {
    type: 'tag',
    field: 'contact_keywords',
    label: '联系方式关键词',
    description: '系统会用这些词来识别联系方式，例如微信、QQ、手机号。',
    placeholder: '输入后回车添加，例如 微信',
  },
];
