import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { authMode } from '../config';
import { DEFAULT_AUTHENTICATED_PATH, sanitizeRedirectTarget } from '../redirect';
import { useAuthStore } from '../store';
import type { ApiError, LoginPayload } from '../types';
import { emailRules, loginPasswordRules, normalizeEmail } from '../validators';

type LoginFormValues = LoginPayload;

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<LoginFormValues>();
  const [submitError, setSubmitError] = useState('');
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);

  async function handleSubmit(values: LoginFormValues) {
    setSubmitError('');

    try {
      await login({
        ...values,
        email: normalizeEmail(values.email),
      });
      message.success('登录成功');
      const redirect = sanitizeRedirectTarget(searchParams.get('redirect'));
      const nextPath = redirect || DEFAULT_AUTHENTICATED_PATH;
      const currentPath = `${location.pathname}${location.search}`;
      if (nextPath !== currentPath) {
        navigate(nextPath, { replace: true });
      }
    } catch (error) {
      const safeMessage =
        error instanceof Error ? (error as ApiError).message : '登录失败，请稍后重试';
      setSubmitError(safeMessage || '登录失败，请稍后重试');
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card" bordered={false}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            登录审稿工作台
          </Typography.Title>
          <Typography.Text type="secondary">
            使用企业邮箱登录，继续访问 Bot 审稿工作台。
          </Typography.Text>
          {authMode === 'mock' ? (
            <Alert
              type="info"
              showIcon
              message="当前为本地 mock 模式"
              description="演示账号：admin@example.com / Admin#2026Demo"
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="当前为真实 API 鉴权模式"
              description="登录成功后由后端写入 httpOnly session cookie，前端通过 /auth/me 恢复身份。"
            />
          )}
          {submitError ? <Alert type="error" showIcon message={submitError} /> : null}
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={status === 'loading'}
          style={{ marginTop: 24 }}
          initialValues={{ remember: true }}
        >
          <Form.Item label="邮箱" name="email" normalize={normalizeEmail} rules={emailRules}>
            <Input
              prefix={<MailOutlined />}
              placeholder="name@example.com"
              autoComplete="username"
              maxLength={120}
            />
          </Form.Item>

          <Form.Item label="密码" name="password" rules={loginPasswordRules}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
              maxLength={72}
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住当前登录状态</Checkbox>
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={status === 'loading'}>
            登录
          </Button>
        </Form>

        <div className="auth-card__footer">
          <Link to="/forgot-password">忘记密码</Link>
          <span>
            还没有账号？<Link to="/register">立即注册</Link>
          </span>
        </div>
      </Card>
    </div>
  );
}
