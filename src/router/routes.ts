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
  },
  {
    name: 'Lobby',
    path: '/lobby',
    component: () => import('@/pages/LobbyPage.vue'),
  },
  {
    name: 'Game',
    path: '/match',
    component: () => import('@/pages/MatchPage.vue'),
  },
  {
    name: 'Settings',
    path: '/settings',
    component: () => import('@/pages/SettingsPage.vue'),
  },
  {
    name: 'ServerUnavailable',
    path: '/server-unavailable',
    component: () => import('@/pages/ServerUnavailablePage.vue'),
  },
];
