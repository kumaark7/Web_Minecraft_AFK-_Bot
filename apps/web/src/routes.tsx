import type { ReactNode } from 'react';

import Activity from './pages/Activity';
import Bots from './pages/Bots';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Servers from './pages/Servers';
import Settings from './pages/Settings';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Dashboard',
    path: '/',
    element: <Dashboard />,
    public: true,
  },
  {
    name: 'Servers',
    path: '/servers',
    element: <Servers />,
    public: true,
  },
  {
    name: 'Bots',
    path: '/bots',
    element: <Bots />,
    public: true,
  },
  {
    name: 'Activity',
    path: '/activity',
    element: <Activity />,
    public: true,
  },
  {
    name: 'Logs',
    path: '/logs',
    element: <Logs />,
    public: true,
  },
  {
    name: 'Settings',
    path: '/settings',
    element: <Settings />,
    public: true,
  },
];
