import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

import type {
  PlatformChannel,
  PlatformKey,
} from '../../features/platforms';
import type {
  RiskLevel,
  ReviewStatus,
  SubmissionSearchParamsState,
} from '../../types/submission';

type UseSubmissionFiltersOptions = {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
};

export type SubmissionFilterValues = {
  jobId?: string;
  keyword?: string;
  source_plugin_name?: string;
  platform?: PlatformKey;
  channel?: PlatformChannel;
  contentType?: string;
  review_status?: ReviewStatus;
  risk_level?: RiskLevel;
  date_range?: [Dayjs, Dayjs];
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

function parseDateRange(searchParams: URLSearchParams): [Dayjs, Dayjs] | undefined {
  const startAt = searchParams.get('startAt');
  const endAt = searchParams.get('endAt');

  if (!startAt || !endAt) {
    return undefined;
  }

  const start = dayjs(startAt);
  const end = dayjs(endAt);

  if (!start.isValid() || !end.isValid()) {
    return undefined;
  }

  return [start, end];
}

export function useSubmissionFilters({
  searchParams,
  setSearchParams,
}: UseSubmissionFiltersOptions) {
  const filters = useMemo<SubmissionFilterValues>(
    () => ({
      jobId: searchParams.get('jobId') ?? undefined,
      keyword: searchParams.get('keyword') ?? undefined,
      source_plugin_name: searchParams.get('source_plugin_name') ?? undefined,
      platform: (searchParams.get('platform') as PlatformKey | null) ?? undefined,
      channel: (searchParams.get('channel') as PlatformChannel | null) ?? undefined,
      contentType: searchParams.get('contentType') ?? undefined,
      review_status: (searchParams.get('review_status') as ReviewStatus | null) ?? undefined,
      risk_level: (searchParams.get('risk_level') as RiskLevel | null) ?? undefined,
      date_range: parseDateRange(searchParams),
    }),
    [searchParams],
  );

  const formInitialValues = useMemo<SubmissionFilterValues>(
    () => ({
      keyword: filters.keyword,
      jobId: filters.jobId,
      source_plugin_name: filters.source_plugin_name,
      platform: filters.platform,
      channel: filters.channel,
      contentType: filters.contentType,
      review_status: filters.review_status,
      risk_level: filters.risk_level,
      date_range: filters.date_range,
    }),
    [filters],
  );

  function applyFilters(values: SubmissionFilterValues) {
    updateSearchParams(searchParams, setSearchParams, {
      keyword: values.keyword?.trim() || undefined,
      jobId: values.jobId,
      source_plugin_name: values.source_plugin_name,
      platform: values.platform,
      channel: values.channel,
      contentType: values.contentType,
      review_status: values.review_status,
      risk_level: values.risk_level,
      startAt: values.date_range?.[0]?.format('YYYY-MM-DD'),
      endAt: values.date_range?.[1]?.format('YYYY-MM-DD'),
      page: '1',
    });
  }

  function resetFilters() {
    updateSearchParams(searchParams, setSearchParams, {
      keyword: undefined,
      jobId: undefined,
      source_plugin_name: undefined,
      platform: undefined,
      channel: undefined,
      contentType: undefined,
      review_status: undefined,
      risk_level: undefined,
      startAt: undefined,
      endAt: undefined,
      page: '1',
    });
  }

  return {
    filters,
    formInitialValues,
    applyFilters,
    resetFilters,
  };
}

export function getSearchParamsState(searchParams: URLSearchParams): SubmissionSearchParamsState {
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '10');
  const sortFieldParam = searchParams.get('sortField');
  const sortOrderParam = searchParams.get('sortOrder');

  return {
    keyword: searchParams.get('keyword') ?? undefined,
    jobId: searchParams.get('jobId') ?? undefined,
    source_plugin_name: searchParams.get('source_plugin_name') ?? undefined,
    platform: (searchParams.get('platform') as PlatformKey | null) ?? undefined,
    channel: (searchParams.get('channel') as PlatformChannel | null) ?? undefined,
    contentType: searchParams.get('contentType') ?? undefined,
    review_status: (searchParams.get('review_status') as ReviewStatus | null) ?? undefined,
    risk_level: (searchParams.get('risk_level') as RiskLevel | null) ?? undefined,
    startAt: searchParams.get('startAt') ?? undefined,
    endAt: searchParams.get('endAt') ?? undefined,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
    sortField:
      sortFieldParam === 'publishTime' || sortFieldParam === 'quality_score'
        ? sortFieldParam
        : undefined,
    sortOrder:
      sortOrderParam === 'ascend' || sortOrderParam === 'descend'
        ? sortOrderParam
        : undefined,
  };
}
