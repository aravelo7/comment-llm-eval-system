import {
  Alert,
  App,
  Button,
  Checkbox,
  Descriptions,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PageContainer, SectionCard } from '../components';
import {
  createManualImportConsent,
  deleteImportJob,
  disconnectWeiboOauth,
  fetchImportJobDetail,
  fetchImportJobs,
  fetchReviewResults,
  fetchWeiboOauthStart,
  fetchWeiboOauthStatus,
  importWeiboPrivateMessages,
  runImportJobReview,
  type ImportJobRecord,
  type ReviewResultRecord,
  type WeiboOauthStatusResponse,
} from '../features/platforms';

type ConsentState = {
  confirmAuthorizedData: boolean;
  agreeManualImport: boolean;
  acknowledgeDesensitization: boolean;
};

const initialConsentState: ConsentState = {
  confirmAuthorizedData: false,
  agreeManualImport: false,
  acknowledgeDesensitization: false,
};

const jobColumns: ColumnsType<ImportJobRecord> = [
  { title: '批次 ID', dataIndex: 'id', key: 'id', width: 220 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (value: ImportJobRecord['status']) => {
      const colorMap = {
        pending: 'default',
        processing: 'processing',
        completed: 'success',
        failed: 'error',
      } as const;
      return <Tag color={colorMap[value]}>{value}</Tag>;
    },
  },
  { title: '会话数', dataIndex: 'conversationCount', key: 'conversationCount', width: 100 },
  { title: '消息总数', dataIndex: 'messageCount', key: 'messageCount', width: 100 },
  { title: '成功数', dataIndex: 'successCount', key: 'successCount', width: 100 },
  { title: '失败数', dataIndex: 'failedCount', key: 'failedCount', width: 100 },
  {
    title: '导入时间',
    dataIndex: 'importedAt',
    key: 'importedAt',
    width: 180,
    render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
  },
];

const reviewColumns: ColumnsType<ReviewResultRecord> = [
  { title: '消息 ID', dataIndex: 'messageId', key: 'messageId', width: 160 },
  { title: '决策', dataIndex: 'decision', key: 'decision', width: 120 },
  { title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', width: 100 },
  { title: '分数', dataIndex: 'score', key: 'score', width: 90 },
  { title: '说明', dataIndex: 'comment', key: 'comment' },
];

const oauthStatusLabelMap: Record<WeiboOauthStatusResponse['status'], string> = {
  not_connected: '未连接',
  connected_no_dm_permission: '已连接，未获私信权限',
  connected_dm_permission_unavailable: '已连接，未获私信权限',
  connected_dm_permission_available: '已连接，官方读取能力可用',
  oauth_not_configured: '官方 OAuth 未配置',
};

function getFileType(fileName: string) {
  return fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
}

function getOauthStatusAlert(status: WeiboOauthStatusResponse | null) {
  if (!status) {
    return {
      type: 'info' as const,
      message: '正在检查当前微博连接状态',
      description: '当前版本只做 OAuth 连接闭环与授权状态展示，不会自动读取任何私信。',
    };
  }

  if (status.status === 'oauth_not_configured') {
    return {
      type: 'warning' as const,
      message: '官方 OAuth 未配置',
      description: '当前环境未配置 WEIBO_APP_KEY / WEIBO_APP_SECRET / WEIBO_REDIRECT_URI 或未启用 WEIBO_OAUTH_ENABLED，请继续使用 manual_import。',
    };
  }

  if (status.hasDirectMessageReadPermission) {
    return {
      type: 'success' as const,
      message: '微博账号已连接，官方读取能力可用',
      description: '当前版本仍只展示授权状态，不会自动同步私信。私信审核仍建议按合规流程明确控制。',
    };
  }

  if (status.connected) {
    return {
      type: 'info' as const,
      message: '已连接微博账号，但当前未获私信读取权限',
      description: '当前未获微博私信官方读取权限，请继续使用 manual_import 导入已导出的私信数据。',
    };
  }

  return {
    type: 'info' as const,
    message: '当前未连接微博账号',
    description: '可以先连接微博账号查看授权状态；若未获 direct_message:read，仍默认使用 manual_import。',
  };
}

export function WeiboManualImportPage() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [consentState, setConsentState] = useState<ConsentState>(initialConsentState);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<ImportJobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<Awaited<ReturnType<typeof fetchImportJobDetail>> | null>(null);
  const [reviewResults, setReviewResults] = useState<ReviewResultRecord[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [runningReview, setRunningReview] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<WeiboOauthStatusResponse | null>(null);
  const [loadingOauthStatus, setLoadingOauthStatus] = useState(false);
  const [startingOauth, setStartingOauth] = useState(false);
  const [disconnectingOauth, setDisconnectingOauth] = useState(false);

  const allConsentsChecked = useMemo(() => Object.values(consentState).every(Boolean), [consentState]);
  const oauthAlert = useMemo(() => getOauthStatusAlert(oauthStatus), [oauthStatus]);

  async function loadOauthStatus(showToast = false) {
    setLoadingOauthStatus(true);
    try {
      const result = await fetchWeiboOauthStatus();
      setOauthStatus(result);
      if (showToast) {
        void message.success('已更新微博连接状态');
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '检查连接状态失败');
    } finally {
      setLoadingOauthStatus(false);
    }
  }

  async function loadJobs(nextSelectedJobId?: string | null) {
    setLoadingJobs(true);
    try {
      const result = await fetchImportJobs();
      setJobs(result.items);
      const resolvedJobId = nextSelectedJobId ?? selectedJobId ?? result.items[0]?.id ?? null;
      setSelectedJobId(resolvedJobId);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '加载导入任务失败');
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadJobs(null), loadOauthStatus(false)]);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauth = params.get('oauth');

    if (!oauth) {
      return;
    }

    const feedbackMap: Record<string, string> = {
      connected: '微博账号连接完成，可继续查看授权状态。',
      oauth_not_configured: '官方 OAuth 未配置，请继续使用 manual_import。',
      invalid_state: 'OAuth state 校验失败，请重新发起连接。',
      invalid_callback: 'OAuth 回调参数不完整，请重新发起连接。',
      exchange_failed: '微博 OAuth token 交换失败，请稍后重试。',
      user_not_found: '未找到当前回调对应的本地用户。',
    };

    const feedback = feedbackMap[oauth];
    if (feedback) {
      if (oauth === 'connected') {
        void message.success(feedback);
      } else {
        void message.warning(feedback);
      }
    }

    void loadOauthStatus(false);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, message, navigate]);

  useEffect(() => {
    let disposed = false;

    async function loadDetail(jobId: string) {
      try {
        const [detail, reviews] = await Promise.all([
          fetchImportJobDetail(jobId),
          fetchReviewResults(jobId),
        ]);
        if (disposed) {
          return;
        }
        setJobDetail(detail);
        setReviewResults(reviews.items);
      } catch {
        if (!disposed) {
          setJobDetail(null);
          setReviewResults([]);
        }
      }
    }

    if (!selectedJobId) {
      setJobDetail(null);
      setReviewResults([]);
      return;
    }

    void loadDetail(selectedJobId);

    return () => {
      disposed = true;
    };
  }, [selectedJobId]);

  const uploadProps: UploadProps = {
    accept: '.json,.csv',
    maxCount: 1,
    beforeUpload: (file) => {
      const isAllowed = file.name.endsWith('.json') || file.name.endsWith('.csv');
      if (!isAllowed) {
        void message.error('仅支持 .json 或 .csv 文件');
        return Upload.LIST_IGNORE;
      }
      setSelectedFile(file as File);
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          size: file.size,
          status: 'done',
        },
      ]);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
      setFileList([]);
    },
    fileList,
  };

  async function handleOauthConnect() {
    setStartingOauth(true);
    try {
      const result = await fetchWeiboOauthStart();
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '发起微博账号连接失败');
    } finally {
      setStartingOauth(false);
    }
  }

  async function handleOauthDisconnect() {
    setDisconnectingOauth(true);
    try {
      const result = await disconnectWeiboOauth();
      setOauthStatus(result.status);
      void message.success('已断开微博账号连接');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '断开连接失败');
    } finally {
      setDisconnectingOauth(false);
    }
  }

  async function handleSubmit() {
    if (!allConsentsChecked) {
      void message.error('请先勾选全部授权确认项');
      return;
    }
    if (!selectedFile) {
      void message.error('请先选择导入文件');
      return;
    }
    if (selectedFile.size === 0) {
      void message.error('导入文件为空');
      return;
    }

    setSubmitting(true);
    try {
      const [consentResponse, fileContent] = await Promise.all([
        createManualImportConsent({ statements: consentState }),
        selectedFile.text(),
      ]);

      const result = await importWeiboPrivateMessages({
        consentId: consentResponse.consent.id,
        fileName: selectedFile.name,
        fileType: getFileType(selectedFile.name),
        fileContent,
      });

      await loadJobs(result.job.id);
      setSelectedFile(null);
      setFileList([]);
      void message.success(`已完成导入，消息 ${result.job.messageCount} 条。`);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '微博私信导入失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRunReview(jobId: string) {
    setRunningReview(true);
    try {
      await runImportJobReview(jobId);
      await loadJobs(jobId);
      void message.success('已重新触发该批次审核');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '重新审核失败');
    } finally {
      setRunningReview(false);
    }
  }

  function handleDelete(jobId: string) {
    modal.confirm({
      title: '删除导入批次',
      content: '删除后会级联清理该批次的消息、会话、审核结果和审计记录，是否继续？',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteImportJob(jobId);
        const fallbackJobId = selectedJobId === jobId ? null : selectedJobId;
        await loadJobs(fallbackJobId);
        void message.success('批次已删除');
      },
    });
  }

  return (
    <PageContainer
      title="微博私信导入"
      subtitle="顶部提供官方连接状态占位；当前版本不自动读取任何私信。若未获 direct_message:read，则继续通过 manual_import 导入已导出的私信数据。"
    >
      <SectionCard title="连接微博账号">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color="blue">official_api：官方连接</Tag>
            <Tag color="gold">manual_import：手动导入</Tag>
          </Space>
          <Alert
            type={oauthAlert.type}
            showIcon
            message={oauthAlert.message}
            description={oauthAlert.description}
          />
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="当前状态">
              {oauthStatus ? oauthStatusLabelMap[oauthStatus.status] : '加载中'}
            </Descriptions.Item>
            <Descriptions.Item label="连接账号 UID">
              {oauthStatus?.uid || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="授权范围">
              {oauthStatus?.scope?.length ? oauthStatus.scope.join(', ') : '未返回 scope'}
            </Descriptions.Item>
            <Descriptions.Item label="当前模式">
              {oauthStatus?.mode || 'manual_import'}
            </Descriptions.Item>
            <Descriptions.Item label="说明">
              {oauthStatus?.hasDirectMessageReadPermission
                ? '已检测到 direct_message:read。当前版本仍只展示状态，不自动同步私信。'
                : '当前未获微博私信官方读取权限，请继续使用 manual_import。'}
            </Descriptions.Item>
          </Descriptions>
          <Space wrap>
            <Button type="primary" onClick={() => void handleOauthConnect()} loading={startingOauth}>
              连接微博账号
            </Button>
            <Button onClick={() => void loadOauthStatus(true)} loading={loadingOauthStatus}>
              检查连接状态
            </Button>
            <Button
              onClick={() => void handleOauthDisconnect()}
              loading={disconnectingOauth}
              disabled={!oauthStatus?.connected}
            >
              断开连接
            </Button>
          </Space>
        </Space>
      </SectionCard>

      <SectionCard title="连接状态说明">
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Text>not_connected：当前未连接微博账号。</Typography.Text>
          <Typography.Text>connected_no_dm_permission：已连接，但当前未获私信读取权限。</Typography.Text>
          <Typography.Text>
            connected_dm_permission_unavailable：已连接，当前仍回退到 manual_import。
          </Typography.Text>
          <Typography.Text>oauth_not_configured：当前环境未配置官方 OAuth。</Typography.Text>
          <Alert
            type="warning"
            showIcon
            message="当前未获微博私信官方读取权限，请继续使用 manual_import"
          />
        </Space>
      </SectionCard>

      <SectionCard title="合规说明">
        <Alert
          type="info"
          showIcon
          message="仅支持用户主动导入其有权处理的数据"
          description="当前版本支持连接微博账号查看授权状态；不实现微博用户名/密码登录、不提取 cookie、不做 session replay、不做验证码或风控绕过、不做非授权私信读取。"
        />
      </SectionCard>

      <SectionCard title="授权确认">
        <Space direction="vertical" size={8}>
          <Checkbox
            checked={consentState.confirmAuthorizedData}
            onChange={(event) =>
              setConsentState((current) => ({
                ...current,
                confirmAuthorizedData: event.target.checked,
              }))
            }
          >
            我确认上传的是我有权处理的数据
          </Checkbox>
          <Checkbox
            checked={consentState.agreeManualImport}
            onChange={(event) =>
              setConsentState((current) => ({
                ...current,
                agreeManualImport: event.target.checked,
              }))
            }
          >
            我同意系统按 manual_import 方式处理
          </Checkbox>
          <Checkbox
            checked={consentState.acknowledgeDesensitization}
            onChange={(event) =>
              setConsentState((current) => ({
                ...current,
                acknowledgeDesensitization: event.target.checked,
              }))
            }
          >
            我知晓系统会进行脱敏与审计
          </Checkbox>
        </Space>
      </SectionCard>

      <SectionCard title="导入已导出的私信数据">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Upload {...uploadProps}>
            <Button>选择 .json / .csv 文件</Button>
          </Upload>
          <Space>
            <Button type="primary" onClick={() => void handleSubmit()} loading={submitting}>
              开始导入
            </Button>
            <Typography.Text type="secondary">
              当前状态：{selectedFile ? `已选择 ${selectedFile.name}` : '未选择文件'}
            </Typography.Text>
          </Space>
        </Space>
      </SectionCard>

      <SectionCard title="导入任务状态">
        <Table<ImportJobRecord>
          rowKey="id"
          loading={loadingJobs}
          columns={jobColumns}
          dataSource={jobs}
          pagination={false}
          onRow={(record) => ({
            onClick: () => setSelectedJobId(record.id),
          })}
          scroll={{ x: 980 }}
        />
      </SectionCard>

      <SectionCard title="导入结果">
        {jobDetail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="批次 ID">{jobDetail.job.id}</Descriptions.Item>
              <Descriptions.Item label="文件">{jobDetail.job.fileName}</Descriptions.Item>
              <Descriptions.Item label="会话数">{jobDetail.job.conversationCount}</Descriptions.Item>
              <Descriptions.Item label="消息数">{jobDetail.job.messageCount}</Descriptions.Item>
              <Descriptions.Item label="导入时间">
                {dayjs(jobDetail.job.importedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="审核汇总">
                {jobDetail.job.reviewSummary
                  ? `approved ${jobDetail.job.reviewSummary.approved} / rejected ${jobDetail.job.reviewSummary.rejected} / manual_review ${jobDetail.job.reviewSummary.manualReview}`
                  : '尚未生成'}
              </Descriptions.Item>
            </Descriptions>
            <Space wrap>
              <Button
                type="primary"
                onClick={() =>
                  navigate(
                    `/submissions?jobId=${encodeURIComponent(jobDetail.job.id)}&platform=weibo&channel=private_message`,
                  )
                }
              >
                进入消息审核列表
              </Button>
              <Button onClick={() => void handleRunReview(jobDetail.job.id)} loading={runningReview}>
                重新运行审核
              </Button>
              <Button danger onClick={() => handleDelete(jobDetail.job.id)}>
                删除该批次
              </Button>
            </Space>
            <Table<ReviewResultRecord>
              rowKey="id"
              columns={reviewColumns}
              dataSource={reviewResults}
              pagination={false}
              scroll={{ x: 900 }}
            />
          </Space>
        ) : (
          <Typography.Text type="secondary">当前还没有可查看的导入批次。</Typography.Text>
        )}
      </SectionCard>
    </PageContainer>
  );
}
