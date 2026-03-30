import { Alert, Button, Card, Form, Space, Typography } from 'antd';
import type { FormInstance } from 'antd';

import { SchemaFormRenderer } from '../../components';
import type { ContentRulesFormValues } from '../../types/rules';
import { contentRulesSchema } from './contentRules.schema';

type RulesBasicFormProps = {
  form: FormInstance<ContentRulesFormValues>;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRestoreDefault: () => void;
  onUndoChanges: () => void;
};

export function RulesBasicForm({
  form,
  hasUnsavedChanges,
  onSave,
  onRestoreDefault,
  onUndoChanges,
}: RulesBasicFormProps) {
  return (
    <Card bordered={false} className="section-card">
      <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          基础投稿要求
        </Typography.Title>
        <Typography.Text type="secondary">
          这里决定什么样的投稿可以直接通过，什么样的内容需要人工确认。
        </Typography.Text>
      </Space>

      <SchemaFormRenderer schema={contentRulesSchema} />

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 8, marginBottom: 16 }}
        message="保存后将影响所有后续审核结果"
        description="你可以先修改表单、看示例和实时预览，再决定是否保存。"
      />

      <Space wrap>
        <Button type="primary" onClick={onSave}>
          保存规则
        </Button>
        <Button onClick={onUndoChanges} disabled={!hasUnsavedChanges}>
          撤销未保存修改
        </Button>
        <Button danger onClick={onRestoreDefault}>
          恢复默认规则
        </Button>
      </Space>
    </Card>
  );
}
