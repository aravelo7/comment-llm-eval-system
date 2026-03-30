import { Space, Typography } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';

type PageContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}>;

export function PageContainer({
  title,
  subtitle,
  extra,
  children,
}: PageContainerProps) {
  return (
    <div className="page-container">
      <div className="page-container__header">
        <Space direction="vertical" size={4}>
          <Typography.Title level={2} className="page-container__title">
            {title}
          </Typography.Title>
          {subtitle ? (
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          ) : null}
        </Space>
        {extra}
      </div>
      <div className="page-container__body">{children}</div>
    </div>
  );
}
