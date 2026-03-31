import {
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Grid, Input, Layout, Menu, Modal, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { UserMenu } from '../../features/auth/components/UserMenu';
import { useRuleStore } from '../../store/ruleStore';
import { appMenuItems } from './menu.config';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const hasUnsavedChanges = useRuleStore((state) => state.hasUnsavedChanges);

  const selectedKeys = useMemo(() => {
    const match = appMenuItems.find((item) =>
      location.pathname.startsWith(item.path),
    );
    return match ? [match.key] : ['dashboard'];
  }, [location.pathname]);

  const menuItems: MenuProps['items'] = appMenuItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  function navigateWithGuard(path: string) {
    if (
      hasUnsavedChanges &&
      location.pathname.startsWith('/rules') &&
      !path.startsWith('/rules')
    ) {
      Modal.confirm({
        title: '当前规则有未保存修改，确认离开吗？',
        content: '如果现在离开，未保存的规则修改会丢失。',
        okText: '确认离开',
        cancelText: '继续编辑',
        onOk: () => navigate(path),
      });
      return;
    }

    navigate(path);
  }

  return (
    <Layout className="app-shell">
      <Sider
        breakpoint="lg"
        collapsedWidth={screens.md ? 80 : 0}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="app-shell__sider"
        width={248}
        trigger={null}
      >
        <div className="app-logo">
          <div className="app-logo__mark">B</div>
          {!collapsed ? (
            <div>
              <Typography.Text strong className="app-logo__title">
                Bot 审稿工作台
              </Typography.Text>
              <div className="app-logo__subtitle">Review Admin</div>
            </div>
          ) : null}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => {
            const menuItem = appMenuItems.find((item) => item.key === key);
            if (menuItem) {
              navigateWithGuard(menuItem.path);
            }
          }}
          className="app-menu"
        />
      </Sider>

      <Layout>
        <Header className="app-shell__header">
          <Space size={12}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
            />
            <div className="app-shell__search">
              <Input
                prefix={<SearchOutlined />}
                placeholder="搜索投稿、规则、插件"
                allowClear
              />
            </div>
          </Space>

          <Space size={16}>
            <Button type="text" icon={<BellOutlined />} />
            <UserMenu />
          </Space>
        </Header>

        <Content className="app-shell__content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
