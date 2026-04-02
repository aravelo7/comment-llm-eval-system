import { Button, Col, DatePicker, Form, Input, Row, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageContainer, SectionCard } from '../components';
import { fetchImportedMessages, platformAdapters } from '../features/platforms';
import { buildSubmissionDataFromItems, buildSubmissionMockData } from '../mock/submissions';
import { useRuleStore } from '../store/ruleStore';
import type {
  ReviewStatus,
  RiskLevel,
  SubmissionItem,
  SubmissionSortField,
} from '../types/submission';
import {
  SubmissionBatchActions,
  SubmissionDetailDrawer,
  SubmissionsTable,
  useSubmissionActions,
  useSubmissionFilters,
  useSubmissionNavigation,
  useSubmissionTableState,
} from './submissions';

type SubmissionFilterValues = {
  jobId?: string;
  keyword?: string;
  source_plugin_name?: string;
  platform?: SubmissionItem['platform'];
  channel?: SubmissionItem['channel'];
  contentType?: string;
  review_status?: ReviewStatus;
  risk_level?: RiskLevel;
  date_range?: [Dayjs, Dayjs];
};

const reviewStatusOptions: Array<{ label: string; value: ReviewStatus }> = [
  { label: '待处理', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '人工复核', value: 'manual_review' },
];

const riskLevelOptions: Array<{ label: string; value: RiskLevel }> = [
  { label: '低风险', value: 'low' },
  { label: '中风险', value: 'medium' },
  { label: '高风险', value: 'high' },
];

const channelOptions = [
  { label: '评论区', value: 'public_comment' },
  { label: '私信', value: 'private_message' },
];

function isWithinRange(createdAt: string, dateRange?: [Dayjs, Dayjs]) {
  if (!dateRange) return true;

  const [start, end] = dateRange;
  const current = dayjs(createdAt);
  return (
    (current.isAfter(start, 'day') || current.isSame(start, 'day')) &&
    (current.isBefore(end, 'day') || current.isSame(end, 'day'))
  );
}

function sortSubmissions(
  items: SubmissionItem[],
  sortField?: SubmissionSortField,
  sortOrder?: 'ascend' | 'descend',
) {
  if (!sortField || !sortOrder) return items;

  const sorted = [...items].sort((left, right) => {
    if (sortField === 'quality_score') {
      return left.quality_score - right.quality_score;
    }
    return dayjs(left.publishTime).valueOf() - dayjs(right.publishTime).valueOf();
  });

  return sortOrder === 'ascend' ? sorted : sorted.reverse();
}

function paginateSubmissions(items: SubmissionItem[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function SubmissionsPage() {
  const [form] = Form.useForm<SubmissionFilterValues>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [importedSubmissionData, setImportedSubmissionData] = useState<SubmissionItem[]>([]);
  const rules = useRuleStore((state) => state.rules);

  const evaluatedSubmissionData = useMemo(() => buildSubmissionMockData(rules), [rules]);
  const mergedSubmissionData = useMemo(
    () => [...importedSubmissionData, ...evaluatedSubmissionData],
    [evaluatedSubmissionData, importedSubmissionData],
  );

  useEffect(() => {
    let disposed = false;

    async function loadImportedSubmissions() {
      try {
        const result = await fetchImportedMessages();
        if (disposed) {
          return;
        }
        setImportedSubmissionData(buildSubmissionDataFromItems(result.items, rules));
      } catch {
        if (!disposed) {
          setImportedSubmissionData([]);
        }
      }
    }

    void loadImportedSubmissions();

    return () => {
      disposed = true;
    };
  }, [rules]);

  const { submissions, stats, updateSubmissionStatus, updateMultipleSubmissionStatus } =
    useSubmissionActions({
      initialData: mergedSubmissionData,
    });

  const { filters, formInitialValues, applyFilters, resetFilters } = useSubmissionFilters({
    searchParams,
    setSearchParams,
  });

  const {
    tableState,
    selectedRowKeys,
    setSelectedRowKeys,
    clearSelection,
    handleTableChange,
    updatePageAfterFilter,
  } = useSubmissionTableState({
    searchParams,
    setSearchParams,
  });

  const pluginOptions = useMemo(
    () =>
      Array.from(new Set(submissions.map((item) => item.source_plugin_name))).map((value) => ({
        label: value,
        value,
      })),
    [submissions],
  );

  const platformOptions = useMemo(
    () =>
      platformAdapters.map((adapter) => ({
        label: adapter.displayName,
        value: adapter.platform,
      })),
    [],
  );

  const contentTypeOptions = useMemo(
    () =>
      Array.from(new Set(submissions.map((item) => item.contentType))).map((value) => ({
        label: value,
        value,
      })),
    [submissions],
  );

  useEffect(() => {
    form.setFieldsValue(formInitialValues);
  }, [form, formInitialValues]);

  const filteredData = useMemo(() => {
    return submissions.filter((item) => {
      const keyword = filters.keyword?.trim().toLowerCase();
      const keywordMatched =
        !keyword ||
        item.contentText.toLowerCase().includes(keyword) ||
        item.authorName.toLowerCase().includes(keyword);

      return (
        (!filters.jobId ||
          String(item.platformMetadata.importJobId || '') === filters.jobId) &&
        keywordMatched &&
        (!filters.source_plugin_name || item.source_plugin_name === filters.source_plugin_name) &&
        (!filters.platform || item.platform === filters.platform) &&
        (!filters.channel || item.channel === filters.channel) &&
        (!filters.contentType || item.contentType === filters.contentType) &&
        (!filters.review_status || item.review_status === filters.review_status) &&
        (!filters.risk_level || item.risk_level === filters.risk_level) &&
        isWithinRange(item.publishTime, filters.date_range)
      );
    });
  }, [filters, submissions]);

  const sortedData = useMemo(
    () =>
      sortSubmissions(
        filteredData,
        tableState.sortField,
        tableState.sortOrder as 'ascend' | 'descend' | undefined,
      ),
    [filteredData, tableState.sortField, tableState.sortOrder],
  );

  useEffect(() => {
    updatePageAfterFilter(sortedData.length);
  }, [sortedData.length, updatePageAfterFilter]);

  const paginatedData = useMemo(
    () => paginateSubmissions(sortedData, tableState.page, tableState.pageSize),
    [sortedData, tableState.page, tableState.pageSize],
  );

  const selectedSubmission = useMemo(
    () =>
      selectedSubmissionId
        ? paginatedData.find((item) => item.id === selectedSubmissionId) ??
          submissions.find((item) => item.id === selectedSubmissionId) ??
          null
        : null,
    [paginatedData, selectedSubmissionId, submissions],
  );

  const { previousItem, nextItem } = useSubmissionNavigation(paginatedData, selectedSubmissionId);

  function handleSearch(values: SubmissionFilterValues) {
    applyFilters(values);
  }

  function handleReset() {
    form.resetFields();
    resetFilters();
  }

  function handleViewDetail(record: SubmissionItem) {
    setSelectedSubmissionId(record.id);
    setDrawerOpen(true);
  }

  function handleReviewAction(id: string, status: ReviewStatus) {
    updateSubmissionStatus(id, status, {
      operatorName: 'admin.current',
      operatorType: 'admin',
      source: 'drawer',
      note: '在详情抽屉中执行审核动作。',
    });
  }

  function handleBatchAction(status: ReviewStatus) {
    const changedCount = updateMultipleSubmissionStatus(selectedRowKeys as string[], status, {
      operatorName: 'reviewer.batch',
      operatorType: 'reviewer',
      source: 'batch_action',
      note: '通过批量操作栏统一更新状态。',
    });

    if (changedCount > 0) {
      clearSelection();
    }
  }

  return (
    <PageContainer
      title="统一审核入口"
      subtitle="集中审核微博、豆瓣、贴吧的评论区和私信内容，统一入池，同时保留平台与渠道差异。"
    >
      <SectionCard title="筛选区">
        <Form form={form} layout="vertical" onFinish={handleSearch}>
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12} xl={5}>
              <Form.Item label="关键词搜索" name="keyword">
                <Input placeholder="搜索正文 / 作者" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="平台" name="platform">
                <Select placeholder="全部平台" allowClear options={platformOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="渠道" name="channel">
                <Select placeholder="全部渠道" allowClear options={channelOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="内容类型" name="contentType">
                <Select placeholder="全部类型" allowClear options={contentTypeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="审核状态" name="review_status">
                <Select placeholder="全部状态" allowClear options={reviewStatusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={3}>
              <Form.Item label="风险等级" name="risk_level">
                <Select placeholder="全部风险" allowClear options={riskLevelOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={4}>
              <Form.Item label="接入来源" name="source_plugin_name">
                <Select placeholder="全部接入" allowClear options={pluginOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} xl={5}>
              <Form.Item label="时间范围" name="date_range">
                <DatePicker.RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Space wrap>
            <Space>
              <span>总数 {stats.total}</span>
              <span className="submission-stats__divider">|</span>
              <span>待处理 {stats.pending}</span>
              <span className="submission-stats__divider">|</span>
              <span>人工复核 {stats.manualReview}</span>
              <span className="submission-stats__divider">|</span>
              <span>已通过 {stats.approved}</span>
              <span className="submission-stats__divider">|</span>
              <span>已拒绝 {stats.rejected}</span>
            </Space>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Space>
        </Form>
      </SectionCard>

      <SectionCard title="批量操作">
        <SubmissionBatchActions
          selectedCount={selectedRowKeys.length}
          onBatchAction={handleBatchAction}
        />
      </SectionCard>

      <SectionCard title="统一审核列表" extra={`当前 ${sortedData.length} 条`}>
        <SubmissionsTable
          dataSource={paginatedData}
          total={sortedData.length}
          current={tableState.page}
          pageSize={tableState.pageSize}
          selectedRowKeys={selectedRowKeys}
          sortField={tableState.sortField}
          sortOrder={tableState.sortOrder}
          onSelectionChange={setSelectedRowKeys}
          onViewDetail={handleViewDetail}
          onTableChange={handleTableChange}
        />
      </SectionCard>

      <SubmissionDetailDrawer
        open={drawerOpen}
        submission={selectedSubmission}
        hasPrevious={Boolean(previousItem)}
        hasNext={Boolean(nextItem)}
        onPrevious={() => setSelectedSubmissionId(previousItem?.id ?? null)}
        onNext={() => setSelectedSubmissionId(nextItem?.id ?? null)}
        onClose={() => setDrawerOpen(false)}
        onReviewAction={handleReviewAction}
      />
    </PageContainer>
  );
}
