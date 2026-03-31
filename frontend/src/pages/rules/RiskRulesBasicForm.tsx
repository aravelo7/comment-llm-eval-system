import { Alert, Button, Card, Space, Typography } from 'antd';
import type { FormInstance } from 'antd';

import { SchemaFormRenderer } from '../../components';
import type { RiskRulesFormValues } from '../../types/rules';
import { riskRulesSchema } from './riskRules.schema';

type RiskRulesBasicFormProps = {
  form: FormInstance<RiskRulesFormValues>;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRestoreDefault: () => void;
  onUndoChanges: () => void;
};

export function RiskRulesBasicForm({
  form,
  hasUnsavedChanges,
  onSave,
  onRestoreDefault,
  onUndoChanges,
}: RiskRulesBasicFormProps) {
  return (
    <Card bordered={false} className="section-card">
      <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          风险规则配置
        </Typography.Title>
        <Typography.Text type="secondary">
          这里决定遇到高风险投稿时，系统是直接拒绝、转人工，还是只做提醒。
        </Typography.Text>
      </Space>

      <SchemaFormRenderer schema={riskRulesSchema} />

      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 8, marginBottom: 16 }}
        message="高风险动作会直接影响审核结果"
        description="建议先看典型风险案例和实时预览，再决定是否保存。"
      />

      <Space wrap>
        <Button type="primary" onClick={onSave}>
          保存风险规则
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
