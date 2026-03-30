import {
  AuditOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SlidersOutlined,
  TagsOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import type { AppMenuItem } from '../../types/menu';

export const appMenuItems: AppMenuItem[] = [
  {
    key: 'dashboard',
    label: '控制台',
    path: '/dashboard',
    icon: <DashboardOutlined />,
  },
  {
    key: 'submissions',
    label: '投稿管理',
    path: '/submissions',
    icon: <UnorderedListOutlined />,
  },
  {
    key: 'rules',
    label: '规则中心',
    path: '/rules',
    icon: <SlidersOutlined />,
  },
  {
    key: 'plugins',
    label: '插件中心',
    path: '/plugins',
    icon: <TagsOutlined />,
  },
  {
    key: 'security',
    label: '安全中心',
    path: '/security',
    icon: <SafetyCertificateOutlined />,
  },
  {
    key: 'audit',
    label: '日志与审计',
    path: '/audit',
    icon: <AuditOutlined />,
  },
  {
    key: 'settings',
    label: '系统设置',
    path: '/settings',
    icon: <SettingOutlined />,
  },
];
