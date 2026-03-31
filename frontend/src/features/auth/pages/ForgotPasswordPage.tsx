import { MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../store';
import type { ApiError, ForgotPasswordPayload } from '../types';
import { emailRules, normalizeEmail } from '../validators';

export function ForgotPasswordPage() {
  const [form] = Form.useForm<ForgotPasswordPayload>();
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(values: ForgotPasswordPayload) {
    setSubmitError('');

    try {
      await forgotPassword({
        email: normalizeEmail(values.email),
      });
      setSubmitted(true);
      message.success('如果邮箱存在，我们会发送重置说明');
      form.resetFields();
    } catch (error) {
      const safeMessage =
        error instanceof Error ? (error as ApiError).message : '提交未成功，请稍后重试';
      setSubmitError(safeMessage || '提交未成功，请稍后重试');
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card" bordered={false}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            找回密码
          </Typography.Title>
          <Typography.Text type="secondary">
            当前页面为前端占位实现。即使后端暂未接入，也会保持统一交互和校验。
          </Typography.Text>
          {submitted ? (
            <Alert
              type="success"
              showIcon
              message="如果该邮箱已注册，我们会发送后续处理说明。"
            />
          ) : null}
          {submitError ? <Alert type="error" showIcon message={submitError} /> : null}
        </Space>

        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 24 }}>
          <Form.Item
            label="邮箱"
            name="email"
            normalize={normalizeEmail}
            rules={emailRules}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="name@example.com"
              autoComplete="email"
              maxLength={120}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            提交
          </Button>
        </Form>

        <div className="auth-card__footer">
          <span>
            记起密码了？<Link to="/login">返回登录</Link>
          </span>
        </div>
      </Card>
    </div>
  );
}
