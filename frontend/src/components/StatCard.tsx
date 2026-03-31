import { Card, Space, Typography } from 'antd';

type StatCardProps = {
  title: string;
  value: string | number;
  hint?: string;
};

export function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <Card className="stat-card" bordered={false}>
      <Space direction="vertical" size={6}>
        <Typography.Text type="secondary">{title}</Typography.Text>
        <Typography.Title level={3} className="stat-card__value">
          {value}
        </Typography.Title>
        <Typography.Text type="secondary">{hint}</Typography.Text>
      </Space>
    </Card>
  );
}
