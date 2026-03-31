import type { Rule } from 'antd/es/form';

const emailRegex =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const nicknameRegex = /^[\u4e00-\u9fa5A-Za-z0-9_.-]+$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{10,72}$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeNickname(value: string) {
  return value.trim();
}

export const emailRules: Rule[] = [
  { required: true, message: '请输入邮箱地址' },
  { max: 120, message: '邮箱长度不能超过 120 个字符' },
  {
    validator: async (_, value?: string) => {
      const normalized = normalizeEmail(value || '');
      if (!normalized || emailRegex.test(normalized)) {
        return;
      }
      throw new Error('请输入有效的邮箱地址');
    },
  },
];

export const nicknameRules: Rule[] = [
  { required: true, message: '请输入昵称' },
  { min: 2, message: '昵称至少 2 个字符' },
  { max: 32, message: '昵称不能超过 32 个字符' },
  {
    validator: async (_, value?: string) => {
      const normalized = normalizeNickname(value || '');
      if (!normalized || nicknameRegex.test(normalized)) {
        return;
      }
      throw new Error('昵称仅支持中文、字母、数字、下划线、点和短横线');
    },
  },
];

export const passwordRules: Rule[] = [
  { required: true, message: '请输入密码' },
  {
    validator: async (_, value?: string) => {
      const raw = value || '';
      if (raw.length > 72) {
        throw new Error('密码不能超过 72 个字符');
      }
      if (!passwordRegex.test(raw)) {
        throw new Error('密码至少 10 位，且需包含大小写字母、数字和特殊字符');
      }
    },
  },
];

export const loginPasswordRules: Rule[] = [
  { required: true, message: '请输入密码' },
  { min: 10, message: '密码格式不正确' },
  { max: 72, message: '密码格式不正确' },
];
