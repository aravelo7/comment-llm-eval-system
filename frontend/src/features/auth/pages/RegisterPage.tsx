import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store';
import type { ApiError, RegisterPayload } from '../types';
import {
  emailRules,
  nicknameRules,
  normalizeEmail,
  normalizeNickname,
  passwordRules,
} from '../validators';

type RegisterFormValues = RegisterPayload;

export function RegisterPage() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);

  async function handleSubmit(values: RegisterFormValues) {
    setSubmitError('');

    try {
      await register({
        ...values,
        email: normalizeEmail(values.email),
        nickname: normalizeNickname(values.nickname),
      });
      message.success('注册成功，请使用新账号登录');
      navigate('/login', { replace: true });
    } catch (error) {
      const safeMessage =
        error instanceof Error ? (error as ApiError).message : '注册未成功，请稍后重试';
      setSubmitError(safeMessage || '注册未成功，请稍后重试');
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card" bordered={false}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            注册审稿账号
          </Typography.Title>
          <Typography.Text type="secondary">
            注册成功后默认进入 reviewer / free 方案，角色和套餐以后端返回为准。
          </Typography.Text>
          {submitError ? <Alert type="error" showIcon message={submitError} /> : null}
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={status === 'loading'}
          style={{ marginTop: 24 }}
        >
          <Form.Item label="邮箱" name="email" normalize={normalizeEmail} rules={emailRules}>
            <Input
              prefix={<MailOutlined />}
              placeholder="name@example.com"
              autoComplete="username"
              maxLength={120}
            />
          </Form.Item>

          <Form.Item
            label="昵称"
            name="nickname"
            normalize={normalizeNickname}
            rules={nicknameRules}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入昵称"
              autoComplete="nickname"
              maxLength={32}
            />
          </Form.Item>

          <Form.Item label="密码" name="password" rules={passwordRules}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="至少 10 位，包含大小写字母、数字和特殊字符"
              autoComplete="new-password"
              maxLength={72}
            />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
              autoComplete="new-password"
              maxLength={72}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={status === 'loading'}>
            注册
          </Button>
        </Form>

        <div className="auth-card__footer">
          <span>
            已有账号？<Link to="/login">返回登录</Link>
          </span>
        </div>
      </Card>
    </div>
  );
}
