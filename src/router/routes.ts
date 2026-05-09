import HomePage from '@/pages/HomePage.vue';
import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    name: 'Home',
    path: '',
    component: HomePage,
  },
  {
    name: 'Auth',
    path: '',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        name: 'Login',
        path: '/signin',
        component: () => import('@/components/common/Forms/LoginForm.vue'),
      },
      {
        name: 'Register',
        path: '/signup',
        component: () => import('@/components/common/Forms/RegisterForm.vue'),
      },
    ],
    meta: {
      requiredGuest: true,
    },
  },
  {
    name: 'Lobby',
    path: '/lobby',
    component: () => import('@/pages/LobbyPage.vue'),
    meta: {
      requiredAuth: true,
    },
  },
  {
    name: 'Game',
    path: '/match',
    component: () => import('@/pages/MatchPage.vue'),
    meta: {
      requiredAuth: true,
    },
  },
  {
    name: 'Settings',
    path: '/settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: {
      requiredAuth: true,
    },
  },
  {
    name: 'Stats',
    path: '/stats',
    component: () => import('@/pages/StatsPage.vue'),
    meta: {
      requiredAuth: true,
    },
  },
  {
    name: 'ServerUnavailable',
    path: '/server-unavailable',
    component: () => import('@/pages/ServerUnavailablePage.vue'),
  },
];
