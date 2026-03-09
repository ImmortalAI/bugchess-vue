import HomePage from '@/pages/HomePage.vue'
import type { RouteRecordRaw } from 'vue-router'

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
        component: () => import('@/components/common/LoginForm.vue'),
      },
      {
        name: 'Register',
        path: '/signup',
        component: () => import('@/components/common/RegisterForm.vue'),
      },
    ],
  },
]
