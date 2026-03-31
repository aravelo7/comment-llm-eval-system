import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Card, Space, Switch, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { getPlatformAdapter } from '../adapters/registry';
import type {
  PlatformAuthStatus,
  PlatformCapabilityStatus,
  PlatformIntegrationConfig,
  PlatformIntegrationStatus,
  PlatformSourceMode,
} from '../types';

type PlatformCardProps = {
  integration: PlatformIntegrationConfig;
};

export function getPlatformStatusTag(status: PlatformIntegrationStatus) {
  if (status === 'enabled') {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        已启用
      </Tag>
    );
  }

  if (status === 'warning') {
    return (
      <Tag icon={<ExclamationCircleOutlined />} color="warning">
        需关注
      </Tag>
    );
  }

  return (
    <Tag icon={<ClockCircleOutlined />} color="default">
      未启用
    </Tag>
  );
}

export function getPlatformSourceModeLabel(mode: PlatformSourceMode) {
  if (mode === 'official_api') return 'Official API';
  if (mode === 'manual_import') return 'Manual Import';
  if (mode === 'web_session_import') return 'Web Session Import';
  if (mode === 'mock') return 'Mock';
  return 'API';
}

export function getPlatformAuthStatusLabel(status: PlatformAuthStatus) {
  switch (status) {
    case 'authorized':
      return '已授权';
    case 'expired':
      return '已过期';
    case 'manual_only':
      return '仅手工导入';
    case 'configured':
      return '已配置';
    case 'backend_only':
      return '后端托管';
    case 'missing':
    default:
      return '未配置';
  }
}

export function getPlatformCapabilityLabel(status: PlatformCapabilityStatus) {
  switch (status) {
    case 'available':
      return '可自动接入';
    case 'official_permission_required':
      return '依赖官方权限';
    case 'manual_import_only':
      return '仅支持手工导入';
    case 'unsupported':
    default:
      return '暂不支持';
  }
}

export function getPlatformChannelLabel(channel: 'public_comment' | 'private_message') {
  return channel === 'private_message' ? '私信' : '评论区';
}

export function PlatformCard({ integration }: PlatformCardProps) {
  const navigate = useNavigate();
  const adapter = getPlatformAdapter(integration.platform);

  function handleOpenConfig() {
    const nextPath = `/plugins/${integration.platform}`;

    if (!integration.platform) {
      console.warn('PlatformCard navigation skipped: missing platform key.');
      navigate('/plugins', { replace: true });
      return;
    }

    navigate(nextPath);
  }

  return (
    <Card bordered={false} className="plugin-card">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Tag color={adapter.color}>{adapter.displayName}</Tag>
            {getPlatformStatusTag(integration.status)}
          </Space>
          <Switch checked={integration.enabled} />
        </Space>

        <Typography.Title level={4} className="plugin-card__title">
          {adapter.displayName}
        </Typography.Title>

        <Typography.Text type="secondary">
          接入模式：{getPlatformSourceModeLabel(integration.mode)}
        </Typography.Text>
        <Typography.Text type="secondary">
          支持渠道：{integration.supportedChannels.map(getPlatformChannelLabel).join(' / ')}
        </Typography.Text>
        <Typography.Text type="secondary">
          最近同步：{integration.lastSyncedAt || '暂无'}
        </Typography.Text>
        <Typography.Text type="secondary">
          授权状态：{getPlatformAuthStatusLabel(integration.authStatus)}
        </Typography.Text>
        <Typography.Text type="secondary">
          速率状态：{integration.rateLimitStatus}
        </Typography.Text>

        {integration.authorization ? (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Typography.Text strong>微博授权状态</Typography.Text>
            <Typography.Text type="secondary">
              账号：{integration.authorization.accountLabel || '未绑定'}
            </Typography.Text>
            <Typography.Text type="secondary">
              状态说明：{integration.authorization.statusMessage}
            </Typography.Text>
            <Typography.Text type="secondary">
              授权时间：{integration.authorization.authorizedAt || '未知'}
            </Typography.Text>
            <Typography.Text type="secondary">
              过期时间：{integration.authorization.expiresAt || '以官方回调为准'}
            </Typography.Text>
            <Typography.Text type="secondary">
              已授予范围：
              {(integration.authorization.grantedScopes || []).join(', ') || '暂无'}
            </Typography.Text>
          </Space>
        ) : null}

        {integration.channelAccess?.length ? (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Typography.Text strong>渠道接入策略</Typography.Text>
            {integration.channelAccess.map((item) => (
              <Typography.Text type="secondary" key={`${integration.platform}-${item.channel}`}>
                {getPlatformChannelLabel(item.channel)}：{getPlatformSourceModeLabel(item.sourceMode)} /{' '}
                {getPlatformCapabilityLabel(item.capabilityStatus)} / {item.notes}
              </Typography.Text>
            ))}
          </Space>
        ) : null}

        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {integration.riskNotice}
        </Typography.Paragraph>

        <Space wrap>
          <Button type="primary" onClick={handleOpenConfig}>
            配置入口
          </Button>
          <Button>查看字段映射</Button>
        </Space>
      </Space>
    </Card>
  );
}
