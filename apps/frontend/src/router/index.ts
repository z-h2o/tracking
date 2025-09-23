import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard/index.vue'),
        meta: {
          title: '仪表板',
          icon: 'DataBoard'
        }
      },
      {
        path: '/realtime',
        name: 'Realtime',
        component: () => import('@/views/Realtime/index.vue'),
        meta: {
          title: '实时监控',
          icon: 'Monitor'
        }
      },
      {
        path: '/analytics',
        name: 'Analytics',
        redirect: '/analytics/pages',
        meta: {
          title: '数据分析',
          icon: 'TrendCharts'
        },
        children: [
          {
            path: '/analytics/pages',
            name: 'PageAnalytics',
            component: () => import('@/views/Analytics/PageAnalytics.vue'),
            meta: {
              title: '页面分析',
              icon: 'Document'
            }
          },
          {
            path: '/analytics/events',
            name: 'EventAnalytics',
            component: () => import('@/views/Analytics/EventAnalytics.vue'),
            meta: {
              title: '事件分析',
              icon: 'Position'
            }
          },
          {
            path: '/analytics/users',
            name: 'UserAnalytics',
            component: () => import('@/views/Analytics/UserAnalytics.vue'),
            meta: {
              title: '用户分析',
              icon: 'User'
            }
          }
        ]
      },
      {
        path: '/errors',
        name: 'ErrorMonitoring',
        component: () => import('@/views/ErrorMonitoring/index.vue'),
        meta: {
          title: '错误监控',
          icon: 'Warning'
        }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/Settings/index.vue'),
        meta: {
          title: '系统设置',
          icon: 'Setting'
        }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/index.vue'),
    meta: {
      title: '登录',
      hideInMenu: true
    }
  },
  {
    path: '/demo',
    name: 'Demo',
    component: () => import('@/views/Demo/index.vue'),
    meta: {
      title: '测试',
      hideInMenu: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/Error/404.vue'),
    meta: {
      title: '页面不存在',
      hideInMenu: true
    }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

// 路由守卫
router.beforeEach((to, from, next) => {
  NProgress.start()
  
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 埋点监控系统`
  }
  
  next()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
