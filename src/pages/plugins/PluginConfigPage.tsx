import { App, Button, Descriptions, Empty, Input, Modal, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageContainer, SectionCard } from '../../components';
import {
  fetchImportedSubmissions,
  getPlatformAdapter,
  importWeiboWebComments,
  platformIntegrationConfigs,
  type PlatformKey,
  type WeiboWebCommentImportPayload,
  weiboPlugin,
} from '../../features/platforms';
import {
  getPlatformAuthStatusLabel,
  getPlatformChannelLabel,
  getPlatformSourceModeLabel,
} from '../../features/platforms/components';

const validPlatforms: PlatformKey[] = ['weibo', 'douban', 'tieba'];

export function PluginConfigPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { platform } = useParams<{ platform: string }>();
  const [importOpen, setImportOpen] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [submittingImport, setSubmittingImport] = useState(false);

  const integration = useMemo(
    () =>
      platform && validPlatforms.includes(platform as PlatformKey)
        ? platformIntegrationConfigs.find((item) => item.platform === platform)
        : undefined,
    [platform],
  );

  useEffect(() => {
    if (!platform || !validPlatforms.includes(platform as PlatformKey)) {
      console.warn(`PluginConfigPage: unknown platform route "${platform}". Redirecting to /plugins.`);
      navigate('/plugins', { replace: true });
    }
  }, [navigate, platform]);

  if (!integration) {
    return (
      <PageContainer title="插件配置" subtitle="正在返回平台接入列表。">
        <SectionCard title="无效平台">
          <Empty description="未找到对应平台配置，已回退到平台接入页。" />
        </SectionCard>
      </PageContainer>
    );
  }

  const adapter = getPlatformAdapter(integration.platform);
  const isWeibo = integration.platform === 'weibo';
  const collectorScript =
    isWeibo && typeof weiboPlugin.getWeiboVisibleCommentCollectorScript === 'function'
      ? weiboPlugin.getWeiboVisibleCommentCollectorScript()
      : '当前版本暂未提供网页评论采集脚本';
  const collectorSteps =
    isWeibo && typeof weiboPlugin.getWebSessionImportGuidance === 'function'
      ? weiboPlugin.getWebSessionImportGuidance()
      : ['当前版本暂未提供网页评论采集说明。'];

  async function handleImportSubmit() {
    if (!isWeibo) {
      return;
    }

    let parsed: WeiboWebCommentImportPayload;
    try {
      parsed = JSON.parse(importPayload) as WeiboWebCommentImportPayload;
    } catch {
      void message.error('导入内容不是合法 JSON。');
      return;
    }

    setSubmittingImport(true);
    try {
      const result = await importWeiboWebComments(parsed);
      await fetchImportedSubmissions();
      void message.success(`已导入 ${result.importedCount} 条微博当前页可见评论。`);
      setImportPayload('');
      setImportOpen(false);
      navigate('/submissions');
    } catch (error) {
      const safeMessage = error instanceof Error ? error.message : '微博网页评论导入失败';
      void message.error(safeMessage);
    } finally {
      setSubmittingImport(false);
    }
  }

  return (
    <PageContainer
      title={`${adapter.displayName} 配置`}
      subtitle="最小可用配置页：支持查看平台状态，并为微博提供当前页可见评论的手动导入入口。"
    >
      <SectionCard title="基础信息">
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="平台名称">{adapter.displayName}</Descriptions.Item>
          <Descriptions.Item label="接入模式">
            {getPlatformSourceModeLabel(integration.mode)}
          </Descriptions.Item>
          <Descriptions.Item label="支持渠道">
            {integration.supportedChannels.map(getPlatformChannelLabel).join(' / ')}
          </Descriptions.Item>
          <Descriptions.Item label="授权状态">
            {getPlatformAuthStatusLabel(integration.authStatus)}
          </Descriptions.Item>
          <Descriptions.Item label="最近同步时间">
            {integration.lastSyncedAt || '暂无'}
          </Descriptions.Item>
        </Descriptions>
      </SectionCard>

      <SectionCard title="授权与渠道状态">
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {integration.authorization ? (
            <>
              <Typography.Text>账号：{integration.authorization.accountLabel || '未绑定'}</Typography.Text>
              <Typography.Text>
                已授予范围：
                {(integration.authorization.grantedScopes || []).join(', ') || '暂无'}
              </Typography.Text>
              <Typography.Text>状态说明：{integration.authorization.statusMessage}</Typography.Text>
            </>
          ) : (
            <Typography.Text type="secondary">当前平台暂无授权明细展示。</Typography.Text>
          )}

          {integration.channelAccess?.map((item) => (
            <Tag key={`${integration.platform}-${item.channel}`}>
              {getPlatformChannelLabel(item.channel)} / {getPlatformSourceModeLabel(item.sourceMode)}
            </Tag>
          ))}
        </Space>
      </SectionCard>

      {isWeibo ? (
        <SectionCard title="微博网页评论导入">
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Typography.Text>
              仅支持授权用户在自己的浏览器里，对当前已打开微博页面手动导入当前页已可见评论。
            </Typography.Text>
            {collectorSteps.map((step) => (
              <Typography.Text key={step} type="secondary">
                {step}
              </Typography.Text>
            ))}
            <Space wrap>
              <Button type="primary" onClick={() => setImportOpen(true)}>
                导入当前页评论
              </Button>
              <Button
                onClick={() => navigator.clipboard.writeText(collectorScript)}
                disabled={typeof weiboPlugin.getWeiboVisibleCommentCollectorScript !== 'function'}
              >
                复制采集脚本
              </Button>
            </Space>
          </Space>
        </SectionCard>
      ) : null}

      <SectionCard title="占位操作">
        <Space wrap>
          <Button type="primary">重新授权</Button>
          <Button>切换模式</Button>
          <Button onClick={() => navigate('/plugins')}>返回平台接入</Button>
        </Space>
      </SectionCard>

      <Modal
        title="导入当前页微博评论"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={() => void handleImportSubmit()}
        okText="提交导入"
        cancelText="取消"
        confirmLoading={submittingImport}
        width={760}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text strong>浏览器侧采集脚本</Typography.Text>
          <Input.TextArea value={collectorScript} autoSize={{ minRows: 8, maxRows: 14 }} readOnly />
          <Typography.Text strong>粘贴当前页评论 JSON</Typography.Text>
          <Input.TextArea
            value={importPayload}
            onChange={(event) => setImportPayload(event.target.value)}
            placeholder="把你在微博当前页面采集到的 JSON 粘贴到这里"
            autoSize={{ minRows: 10, maxRows: 18 }}
          />
          <Typography.Text type="secondary">
            仅导入用户当前页面已可见评论，不采集私信，不上传 cookie，不绕过微博登录、验证码或风控。
          </Typography.Text>
        </Space>
      </Modal>
    </PageContainer>
  );
}
