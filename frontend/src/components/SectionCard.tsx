import { Card, Space, Typography } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';

type SectionCardProps = PropsWithChildren<{
  title: string;
  extra?: ReactNode;
}>;

export function SectionCard({ title, extra, children }: SectionCardProps) {
  return (
    <Card
      bordered={false}
      title={
        <Space>
          <Typography.Text strong>{title}</Typography.Text>
        </Space>
      }
      extra={extra}
      className="section-card"
    >
      {children}
    </Card>
  );
}
