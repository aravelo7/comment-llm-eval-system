import { PageContainer } from '../components';
import { ReviewLabPanel } from '../features/review-lab';

export function ReviewLabPage() {
  return (
    <PageContainer
      title="LLM 审稿联调"
      subtitle="当前页面会自动读取 /auth/me 恢复的登录用户信息，并将 user.id / user.email / user.plan 透传给 review 服务。"
    >
      <ReviewLabPanel variant="full" showUserCard sourceType="frontend_lab" />
    </PageContainer>
  );
}
