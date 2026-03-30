import { App, Button, Card, Col, Form, Input, Row, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';

import { PageContainer, SectionCard } from '../components';
import type { ContentType } from '../features/platforms';
import type { RuleScopeChannel, RuleScopePlatform, ScopedRule } from '../types/ruleConfig';
import { useRuleStore } from '../store/ruleStore';

type ScopedRuleFormValues = {
  name: string;
  description: string;
  platformScope: RuleScopePlatform;
  channelScope: RuleScopeChannel;
      contentTypeScope?: ContentType[];
  keywords: string;
  action: ScopedRule['action'];
  riskLevel: ScopedRule['riskLevel'];
};

const platformScopeOptions = [
  { label: '全平台', value: 'all' },
  { label: '微博', value: 'weibo' },
  { label: '豆瓣', value: 'douban' },
  { label: '贴吧', value: 'tieba' },
];

const channelScopeOptions = [
  { label: '全渠道', value: 'all' },
  { label: '评论区', value: 'public_comment' },
  { label: '私信', value: 'private_message' },
];

const contentTypeOptions = [
  'post',
  'comment',
  'reply',
  'thread_reply',
  'short_review',
  'long_review',
  'group_reply',
  'dm_message',
  'conversation_message',
].map((value) => ({ label: value, value }));

export function RulesPage() {
  const [form] = Form.useForm<ScopedRuleFormValues>();
  const { message } = App.useApp();
  const rules = useRuleStore((state) => state.rules);
  const setRules = useRuleStore((state) => state.setRules);
  const setRiskRules = useRuleStore((state) => state.setRiskRules);
  const addScopedRule = useRuleStore((state) => state.addScopedRule);
  const toggleScopedRule = useRuleStore((state) => state.toggleScopedRule);
  const resetRules = useRuleStore((state) => state.resetRules);

  const columns = useMemo<ColumnsType<ScopedRule>>(
    () => [
      { title: '规则名', dataIndex: 'name', key: 'name', width: 180 },
      { title: '描述', dataIndex: 'description', key: 'description' },
      {
        title: '平台作用域',
        dataIndex: 'platformScope',
        key: 'platformScope',
        width: 110,
        render: (value: string) => <Tag>{value}</Tag>,
      },
      {
        title: '渠道作用域',
        dataIndex: 'channelScope',
        key: 'channelScope',
        width: 120,
        render: (value: string) => <Tag color="purple">{value}</Tag>,
      },
      {
        title: '内容类型',
        dataIndex: 'contentTypeScope',
        key: 'contentTypeScope',
        width: 180,
        render: (value?: string[]) =>
          value?.length ? value.map((item) => <Tag key={item}>{item}</Tag>) : <Tag>全部</Tag>,
      },
      {
        title: '动作',
        dataIndex: 'action',
        key: 'action',
        width: 120,
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 90,
        render: (enabled: boolean, record) => (
          <Switch checked={enabled} onChange={(checked) => toggleScopedRule(record.id, checked)} />
        ),
      },
    ],
    [toggleScopedRule],
  );

  async function handleCreateRule(values: ScopedRuleFormValues) {
    addScopedRule({
      id: `rule-custom-${Date.now()}`,
      name: values.name.trim(),
      description: values.description.trim(),
      enabled: true,
      platformScope: values.platformScope,
      channelScope: values.channelScope,
      contentTypeScope: values.contentTypeScope,
      keywords: values.keywords.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean),
      action: values.action,
      riskLevel: values.riskLevel,
    });
    form.resetFields();
    await message.success('已新增作用域规则');
  }

  return (
    <PageContainer
      title="规则中心"
      subtitle="统一管理多平台、多渠道的基础规则和作用域规则。评论区与私信共用入口，但规则按平台、渠道和内容类型精确生效。"
      extra={
        <Space>
          <Button onClick={resetRules}>恢复默认规则</Button>
          <Button type="primary">查看规则生效说明</Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <SectionCard title="全局内容规则">
            <Form
              layout="vertical"
              initialValues={rules.content}
              onFinish={(values) => {
                setRules(values);
                void message.success('已保存全局内容规则');
              }}
            >
              <Form.Item label="最小正文长度" name="min_length">
                <Input type="number" />
              </Form.Item>
              <Form.Item label="最大正文长度" name="max_length">
                <Input type="number" />
              </Form.Item>
              <Form.Item label="禁止关键词（逗号分隔）" name="forbidden_keywords">
                <Select mode="tags" tokenSeparators={[',', '，']} />
              </Form.Item>
              <Form.Item label="导流关键词（逗号分隔）" name="drainage_keywords">
                <Select mode="tags" tokenSeparators={[',', '，']} />
              </Form.Item>
              <Form.Item label="联系方式关键词（逗号分隔）" name="contact_keywords">
                <Select mode="tags" tokenSeparators={[',', '，']} />
              </Form.Item>
              <Form.Item label="允许联系方式" name="allow_contact_info" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="允许纯外链" name="allow_external_links_only" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="允许图片投稿" name="allow_image_posts" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                保存全局规则
              </Button>
            </Form>
          </SectionCard>
        </Col>
        <Col xs={24} xl={14}>
          <SectionCard title="风险规则">
            <Form
              layout="vertical"
              initialValues={rules.risk}
              onFinish={(values) => {
                setRiskRules(values);
                void message.success('已保存风险规则');
              }}
            >
              <Row gutter={[16, 0]}>
                <Col span={12}>
                  <Form.Item label="高风险关键词" name="high_risk_keywords">
                    <Select mode="tags" tokenSeparators={[',', '，']} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="高风险处理方式" name="high_risk_action">
                    <Select options={[{ label: '拒绝', value: 'rejected' }, { label: '人工复核', value: 'manual_review' }, { label: '仅提示', value: 'warn_only' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="启用角色伪装检测" name="enable_role_spoofing_detection" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="角色伪装处理方式" name="role_spoofing_action">
                    <Select options={[{ label: '拒绝', value: 'rejected' }, { label: '人工复核', value: 'manual_review' }, { label: '仅提示', value: 'warn_only' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="启用指令覆盖检测" name="enable_instruction_override_detection" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="指令覆盖处理方式" name="instruction_override_action">
                    <Select options={[{ label: '拒绝', value: 'rejected' }, { label: '人工复核', value: 'manual_review' }, { label: '仅提示', value: 'warn_only' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="外链处理方式" name="external_link_risk_action">
                    <Select options={[{ label: '通过', value: 'approved' }, { label: '人工复核', value: 'manual_review' }, { label: '拒绝', value: 'rejected' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="图片处理方式" name="image_post_risk_action">
                    <Select options={[{ label: '通过', value: 'approved' }, { label: '人工复核', value: 'manual_review' }, { label: '拒绝', value: 'rejected' }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit">
                保存风险规则
              </Button>
            </Form>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="新增作用域规则">
        <Card bordered={false}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              platformScope: 'all',
              channelScope: 'all',
              action: 'manual_review',
              riskLevel: 'medium',
            }}
            onFinish={handleCreateRule}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}>
                <Form.Item label="规则名称" name="name" rules={[{ required: true, message: '请输入规则名称' }]}>
                  <Input maxLength={40} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="平台作用域" name="platformScope">
                  <Select options={platformScopeOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="渠道作用域" name="channelScope">
                  <Select options={channelScopeOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="描述" name="description" rules={[{ required: true, message: '请输入描述' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="内容类型作用域" name="contentTypeScope">
                  <Select mode="multiple" allowClear options={contentTypeOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="触发关键词（逗号分隔）" name="keywords" rules={[{ required: true, message: '请输入触发关键词' }]}>
                  <Input placeholder="如：加群，外部活动群，顶一下" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="处理动作" name="action">
                  <Select options={[{ label: '通过', value: 'approved' }, { label: '人工复核', value: 'manual_review' }, { label: '拒绝', value: 'rejected' }]} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="风险等级" name="riskLevel">
                  <Select options={[{ label: '低', value: 'low' }, { label: '中', value: 'medium' }, { label: '高', value: 'high' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit">
              新增规则
            </Button>
          </Form>
        </Card>
      </SectionCard>

      <SectionCard title="作用域规则列表">
        <Table rowKey="id" columns={columns} dataSource={rules.scopedRules} pagination={{ pageSize: 8 }} />
        <Typography.Text type="secondary">
          当前已内置评论区通用规则、私信通用规则，以及微博、豆瓣、贴吧的定制规则。后续新增平台时只需补 adapter 和 scoped rule，不需要散落修改页面逻辑。
        </Typography.Text>
      </SectionCard>
    </PageContainer>
  );
}
