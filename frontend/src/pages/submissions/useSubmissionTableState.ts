import type { TablePaginationConfig } from 'antd';
import type { SortOrder, SorterResult } from 'antd/es/table/interface';
import { useCallback, useMemo, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

import type {
  SubmissionItem,
  SubmissionSearchParamsState,
  SubmissionSortField,
} from '../../types/submission';
import { getSearchParamsState } from './useSubmissionFilters';

type UseSubmissionTableStateOptions = {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
};

function updateSearchParams(
  current: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  updates: Record<string, string | undefined>,
) {
  const next = new URLSearchParams(current);

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      next.delete(key);
      return;
    }
    next.set(key, value);
  });

  setSearchParams(next, { replace: true });
}

export function useSubmissionTableState({
  searchParams,
  setSearchParams,
}: UseSubmissionTableStateOptions) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const tableState = useMemo<SubmissionSearchParamsState>(
    () => getSearchParamsState(searchParams),
    [searchParams],
  );

  const handleTableChange = useCallback(
    (
      pagination: TablePaginationConfig,
      sorter: SorterResult<SubmissionItem> | SorterResult<SubmissionItem>[],
    ) => {
      const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      const sortField =
        normalizedSorter?.field === 'publishTime' ||
        normalizedSorter?.field === 'quality_score'
          ? (normalizedSorter.field as SubmissionSortField)
          : undefined;
      const sortOrder = (normalizedSorter?.order as SortOrder | undefined) ?? undefined;

      updateSearchParams(searchParams, setSearchParams, {
        page: String(pagination.current ?? tableState.page),
        pageSize: String(pagination.pageSize ?? tableState.pageSize),
        sortField,
        sortOrder,
      });
    },
    [searchParams, setSearchParams, tableState.page, tableState.pageSize],
  );

  const updatePageAfterFilter = useCallback(
    (total: number) => {
      const maxPage = Math.max(1, Math.ceil(total / tableState.pageSize));
      if (tableState.page > maxPage) {
        updateSearchParams(searchParams, setSearchParams, {
          page: String(maxPage),
        });
      }
    },
    [searchParams, setSearchParams, tableState.page, tableState.pageSize],
  );

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([]);
  }, []);

  return {
    tableState,
    selectedRowKeys,
    setSelectedRowKeys,
    clearSelection,
    handleTableChange,
    updatePageAfterFilter,
  };
}
