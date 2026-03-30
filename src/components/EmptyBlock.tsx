import { Empty } from 'antd';

type EmptyBlockProps = {
  description: string;
  minHeight?: number;
};

export function EmptyBlock({
  description,
  minHeight = 180,
}: EmptyBlockProps) {
  return (
    <div className="empty-block" style={{ minHeight }}>
      <Empty description={description} />
    </div>
  );
}
