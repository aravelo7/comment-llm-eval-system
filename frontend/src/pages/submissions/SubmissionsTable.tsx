import { Table } from 'antd';
import type { TablePaginationConfig } from 'antd';
import type { SortOrder, SorterResult } from 'antd/es/table/interface';
import { useMemo } from 'react';

import type { SubmissionItem, SubmissionSortField } from '../../types/submission';
import { createSubmissionColumns } from './columns';

type SubmissionsTableProps = {
  dataSource: SubmissionItem[];
  total: number;
  current: number;
  pageSize: number;
  loading?: boolean;
  selectedRowKeys: React.Key[];
  sortField?: SubmissionSortField;
  sortOrder?: SortOrder;
  onViewDetail: (record: SubmissionItem) => void;
  onSelectionChange: (selectedKeys: React.Key[]) => void;
  onTableChange: (
    pagination: TablePaginationConfig,
    sorter: SorterResult<SubmissionItem> | SorterResult<SubmissionItem>[],
  ) => void;
};

export function SubmissionsTable({
  dataSource,
  total,
  current,
  pageSize,
  loading,
  selectedRowKeys,
  sortField,
  sortOrder,
  onViewDetail,
  onSelectionChange,
  onTableChange,
}: SubmissionsTableProps) {
  const columns = useMemo(
    () => createSubmissionColumns({ onViewDetail, sortField, sortOrder }),
    [onViewDetail, sortField, sortOrder],
  );

  return (
    <Table<SubmissionItem>
      rowKey="id"
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      scroll={{ x: 1480 }}
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectionChange,
      }}
      pagination={{
        current,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `共 ${count} 条投稿`,
      }}
      onChange={(pagination, _filters, sorter) => onTableChange(pagination, sorter)}
    />
  );
}
