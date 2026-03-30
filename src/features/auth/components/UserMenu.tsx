import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store';

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const menuItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '账户信息',
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: '系统设置',
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        danger: true,
        label: '退出登录',
      },
    ],
    [],
  );

  if (!user) {
    return null;
  }

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: async ({ key }) => {
          if (key === 'logout') {
            await logout();
            navigate('/login', { replace: true });
            return;
          }

          navigate('/settings');
        },
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Space size={10} style={{ cursor: 'pointer' }}>
        <Avatar>{getInitials(user.nickname || user.email)}</Avatar>
        <div className="app-shell__user">
          <Typography.Text strong>{user.nickname}</Typography.Text>
          <Space size={6}>
            <Typography.Text type="secondary">{user.email}</Typography.Text>
            <Tag color={user.plan === 'vip' ? 'gold' : 'default'}>{user.plan}</Tag>
          </Space>
        </div>
      </Space>
    </Dropdown>
  );
}
