# 前端集成指南

本指南详细介绍如何在不同的前端框架和环境中集成埋点监控系统。

## SDK 概述

埋点 SDK 是一个轻量级的 JavaScript 库，提供了完整的埋点数据收集功能：

- **轻量级**: 压缩后小于 50KB
- **TypeScript 支持**: 完整的类型定义
- **框架无关**: 支持 Vue、React、Angular 和原生 JavaScript
- **多种上报方式**: Fetch、XHR、JSONP、Image
- **自动错误监控**: 自动捕获 JavaScript 错误和 Promise 拒绝
- **批量上报**: 减少网络请求，提高性能

## 安装方式

### NPM 安装

```bash
npm install @tracking-system/sdk
```

### CDN 引入

```html
<!-- 生产版本 -->
<script src="https://cdn.jsdelivr.net/npm/@tracking-system/sdk@latest/dist/index.umd.js"></script>

<!-- 开发版本（包含调试信息） -->
<script src="https://cdn.jsdelivr.net/npm/@tracking-system/sdk@latest/dist/index.dev.umd.js"></script>
```

### 本地引入

```html
<script src="/path/to/tracking-sdk.js"></script>
```

## 基础配置

### 配置选项

```typescript
interface TrackingConfig {
  // 必填配置
  endpoint: string              // API 接口地址
  
  // 基础配置
  appVersion?: string           // 应用版本号
  userId?: string              // 用户ID
  sessionId?: string           // 会话ID（自动生成）
  
  // 上报配置
  sender?: 'fetch' | 'xhr' | 'jsonp' | 'image'  // 上报方式
  batchSize?: number           // 批量上报数量（默认：10）
  batchTimeout?: number        // 批量上报超时时间（默认：5000ms）
  maxRetries?: number          // 最大重试次数（默认：3）
  retryDelay?: number          // 重试延迟时间（默认：1000ms）
  
  // 功能开关
  enableErrorTracking?: boolean     // 启用错误监控（默认：true）
  enablePerformanceTracking?: boolean // 启用性能监控（默认：false）
  enableAutoPageView?: boolean      // 启用自动页面浏览埋点（默认：false）
  enableOfflineCache?: boolean      // 启用离线缓存（默认：true）
  
  // 过滤配置
  ignoreUrls?: (string | RegExp)[]  // 忽略的URL列表
  ignoreErrors?: (string | RegExp)[] // 忽略的错误列表
  sampleRate?: number              // 采样率（0-1，默认：1）
  
  // 调试配置
  debug?: boolean              // 调试模式（默认：false）
  console?: boolean            // 控制台输出（默认：false）
}
```

### 基础初始化

```javascript
import { TrackingSDK } from '@tracking-system/sdk'

const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  appVersion: '1.0.0',
  userId: 'user_123',
  enableErrorTracking: true,
  debug: process.env.NODE_ENV === 'development'
})
```

## Vue.js 集成

### 1. 创建插件

```javascript
// plugins/tracking.js
import { TrackingSDK } from '@tracking-system/sdk'

export default {
  install(app, options) {
    // 创建追踪器实例
    const tracker = new TrackingSDK({
      endpoint: options.endpoint,
      appVersion: options.appVersion,
      userId: options.userId,
      enableErrorTracking: true,
      enableAutoPageView: true,
      debug: options.debug || false
    })

    // 全局属性（选项式 API）
    app.config.globalProperties.$tracker = tracker
    
    // 依赖注入（组合式 API）
    app.provide('tracker', tracker)
    
    // 路由切换埋点
    if (options.router) {
      options.router.afterEach((to, from) => {
        tracker.track('page_view', {
          page: {
            title: to.meta.title || document.title,
            url: to.fullPath,
            referrer: from.fullPath
          },
          route: {
            name: to.name,
            params: to.params,
            query: to.query
          }
        })
      })
    }
    
    // Vue 错误处理
    app.config.errorHandler = (error, instance, info) => {
      tracker.trackError({
        type: 'vue_error',
        message: error.message,
        stack: error.stack,
        component: instance?.$options.name || 'Unknown',
        errorInfo: info,
        level: 'high'
      })
    }
  }
}
```

### 2. 注册插件

```javascript
// main.js
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import TrackingPlugin from './plugins/tracking.js'

const app = createApp(App)
const router = createRouter({
  history: createWebHistory(),
  routes: [/* 路由配置 */]
})

app.use(router)
app.use(TrackingPlugin, {
  endpoint: 'https://your-api.com/api/tracking/events',
  appVersion: '1.0.0',
  userId: getCurrentUserId(),
  router: router,
  debug: import.meta.env.DEV
})

app.mount('#app')
```

### 3. 在组件中使用

#### 组合式 API

```vue
<template>
  <div>
    <button @click="handleClick">点击按钮</button>
    <div v-track-view="'home.banner.main'">横幅区域</div>
  </div>
</template>

<script setup>
import { inject, onMounted } from 'vue'

const tracker = inject('tracker')

// 页面加载埋点
onMounted(() => {
  tracker.track('page_view', {
    page: { title: '首页' }
  })
})

// 点击事件埋点
const handleClick = () => {
  tracker.track('click', {
    spm: 'home.button.click',
    element: { text: '点击按钮' }
  })
}
</script>
```

#### 选项式 API

```vue
<template>
  <div>
    <button @click="handleClick">点击按钮</button>
  </div>
</template>

<script>
export default {
  mounted() {
    // 页面加载埋点
    this.$tracker.track('page_view', {
      page: { title: '首页' }
    })
  },
  methods: {
    handleClick() {
      this.$tracker.track('click', {
        spm: 'home.button.click',
        element: { text: '点击按钮' }
      })
    }
  }
}
</script>
```

### 4. 自定义指令

```javascript
// directives/track.js
export const trackView = {
  mounted(el, binding) {
    const tracker = getCurrentInstance().appContext.app.config.globalProperties.$tracker
    
    // 创建 Intersection Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tracker.track('view', {
            spm: binding.value,
            element: {
              tagName: el.tagName,
              className: el.className
            }
          })
        }
      })
    })
    
    observer.observe(el)
    
    // 保存 observer 用于清理
    el._trackObserver = observer
  },
  unmounted(el) {
    if (el._trackObserver) {
      el._trackObserver.disconnect()
    }
  }
}

// 注册指令
app.directive('track-view', trackView)
```

## React.js 集成

### 1. 创建 Context

```javascript
// contexts/TrackingContext.js
import React, { createContext, useContext, useEffect, useRef } from 'react'
import { TrackingSDK } from '@tracking-system/sdk'

const TrackingContext = createContext(null)

export const TrackingProvider = ({ children, config }) => {
  const trackerRef = useRef(null)

  useEffect(() => {
    if (!trackerRef.current) {
      trackerRef.current = new TrackingSDK({
        endpoint: config.endpoint,
        appVersion: config.appVersion,
        userId: config.userId,
        enableErrorTracking: true,
        debug: config.debug || false
      })

      // React 错误边界处理
      const originalConsoleError = console.error
      console.error = (...args) => {
        if (args[0]?.includes?.('React')) {
          trackerRef.current.trackError({
            type: 'react_error',
            message: args.join(' '),
            level: 'high'
          })
        }
        originalConsoleError.apply(console, args)
      }
    }
  }, [config])

  return (
    <TrackingContext.Provider value={trackerRef.current}>
      {children}
    </TrackingContext.Provider>
  )
}

export const useTracking = () => {
  const tracker = useContext(TrackingContext)
  if (!tracker) {
    throw new Error('useTracking must be used within a TrackingProvider')
  }
  return tracker
}
```

### 2. 设置 Provider

```javascript
// App.js
import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { TrackingProvider } from './contexts/TrackingContext'
import Routes from './Routes'

function App() {
  return (
    <TrackingProvider config={{
      endpoint: 'https://your-api.com/api/tracking/events',
      appVersion: '1.0.0',
      userId: getCurrentUserId(),
      debug: process.env.NODE_ENV === 'development'
    }}>
      <Router>
        <Routes />
      </Router>
    </TrackingProvider>
  )
}

export default App
```

### 3. 在组件中使用

```javascript
// components/HomePage.js
import React, { useEffect } from 'react'
import { useTracking } from '../contexts/TrackingContext'

const HomePage = () => {
  const tracker = useTracking()

  useEffect(() => {
    // 页面加载埋点
    tracker.track('page_view', {
      page: { title: '首页' }
    })
  }, [tracker])

  const handleClick = () => {
    tracker.track('click', {
      spm: 'home.button.click',
      element: { text: '点击按钮' }
    })
  }

  return (
    <div>
      <button onClick={handleClick}>点击按钮</button>
    </div>
  )
}

export default HomePage
```

### 4. 自定义 Hooks

```javascript
// hooks/useTrackView.js
import { useEffect, useRef } from 'react'
import { useTracking } from '../contexts/TrackingContext'

export const useTrackView = (spm, options = {}) => {
  const tracker = useTracking()
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tracker.track('view', {
            spm: spm,
            element: {
              tagName: element.tagName,
              className: element.className
            },
            ...options
          })
        }
      })
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [tracker, spm, options])

  return elementRef
}

// 使用示例
const BannerComponent = () => {
  const bannerRef = useTrackView('home.banner.main')
  
  return (
    <div ref={bannerRef} className="banner">
      横幅内容
    </div>
  )
}
```

### 5. 路由埋点

```javascript
// hooks/useRouteTracking.js
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTracking } from '../contexts/TrackingContext'

export const useRouteTracking = () => {
  const location = useLocation()
  const tracker = useTracking()

  useEffect(() => {
    tracker.track('page_view', {
      page: {
        title: document.title,
        url: location.pathname + location.search,
        referrer: document.referrer
      },
      route: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash
      }
    })
  }, [location, tracker])
}

// 在根组件中使用
function App() {
  useRouteTracking()
  
  return (
    <div className="app">
      {/* 应用内容 */}
    </div>
  )
}
```

## Angular 集成

### 1. 创建服务

```typescript
// services/tracking.service.ts
import { Injectable } from '@angular/core'
import { TrackingSDK } from '@tracking-system/sdk'

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private tracker: TrackingSDK

  constructor() {
    this.tracker = new TrackingSDK({
      endpoint: 'https://your-api.com/api/tracking/events',
      appVersion: '1.0.0',
      enableErrorTracking: true,
      debug: false
    })
  }

  track(trigger: string, data: any) {
    return this.tracker.track(trigger, data)
  }

  trackError(error: any) {
    return this.tracker.trackError(error)
  }

  pageView(page: any) {
    return this.tracker.track('page_view', { page })
  }
}
```

### 2. 在组件中使用

```typescript
// components/home.component.ts
import { Component, OnInit } from '@angular/core'
import { TrackingService } from '../services/tracking.service'

@Component({
  selector: 'app-home',
  template: `
    <div>
      <button (click)="handleClick()">点击按钮</button>
    </div>
  `
})
export class HomeComponent implements OnInit {
  constructor(private trackingService: TrackingService) {}

  ngOnInit() {
    // 页面加载埋点
    this.trackingService.pageView({
      title: '首页'
    })
  }

  handleClick() {
    this.trackingService.track('click', {
      spm: 'home.button.click',
      element: { text: '点击按钮' }
    })
  }
}
```

### 3. 路由守卫

```typescript
// guards/tracking.guard.ts
import { Injectable } from '@angular/core'
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { TrackingService } from '../services/tracking.service'

@Injectable({
  providedIn: 'root'
})
export class TrackingGuard implements CanActivate {
  constructor(private trackingService: TrackingService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // 路由切换埋点
    this.trackingService.pageView({
      title: route.data?.title || document.title,
      url: state.url,
      routeName: route.routeConfig?.path
    })
    
    return true
  }
}
```

## 原生 JavaScript 集成

### 1. 基础使用

```html
<!DOCTYPE html>
<html>
<head>
  <title>埋点监控示例</title>
</head>
<body>
  <button id="click-btn">点击按钮</button>
  <div id="view-area">浏览区域</div>

  <script src="https://cdn.jsdelivr.net/npm/@tracking-system/sdk@latest/dist/index.umd.js"></script>
  <script>
    // 初始化追踪器
    const tracker = new TrackingSDK({
      endpoint: 'https://your-api.com/api/tracking/events',
      appVersion: '1.0.0',
      userId: 'user_123',
      enableErrorTracking: true
    })

    // 页面加载埋点
    window.addEventListener('load', () => {
      tracker.track('page_view', {
        page: {
          title: document.title,
          url: location.href
        }
      })
    })

    // 点击事件埋点
    document.getElementById('click-btn').addEventListener('click', (event) => {
      tracker.track('click', {
        spm: 'page.button.click',
        element: {
          tagName: event.target.tagName,
          text: event.target.textContent
        }
      })
    })

    // 浏览区域埋点
    const viewArea = document.getElementById('view-area')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tracker.track('view', {
            spm: 'page.area.view',
            element: {
              id: entry.target.id,
              tagName: entry.target.tagName
            }
          })
        }
      })
    })
    observer.observe(viewArea)
  </script>
</body>
</html>
```

### 2. 模块化使用

```javascript
// tracking.js
import { TrackingSDK } from '@tracking-system/sdk'

class TrackingManager {
  constructor(config) {
    this.tracker = new TrackingSDK(config)
    this.init()
  }

  init() {
    // 自动页面浏览埋点
    this.trackPageView()
    
    // 自动点击埋点
    this.trackClicks()
    
    // 自动表单埋点
    this.trackForms()
  }

  trackPageView() {
    window.addEventListener('load', () => {
      this.tracker.track('page_view', {
        page: {
          title: document.title,
          url: location.href,
          referrer: document.referrer
        }
      })
    })
  }

  trackClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target
      const spm = target.dataset.spm
      
      if (spm) {
        this.tracker.track('click', {
          spm: spm,
          element: {
            tagName: target.tagName,
            className: target.className,
            text: target.textContent?.trim()
          },
          position: {
            x: event.clientX,
            y: event.clientY
          }
        })
      }
    })
  }

  trackForms() {
    document.addEventListener('submit', (event) => {
      const form = event.target
      const formId = form.id || form.dataset.spm
      
      if (formId) {
        this.tracker.track('form_submit', {
          spm: formId,
          formData: new FormData(form),
          action: form.action,
          method: form.method
        })
      }
    })
  }
}

// 初始化
const trackingManager = new TrackingManager({
  endpoint: 'https://your-api.com/api/tracking/events',
  appVersion: '1.0.0',
  enableErrorTracking: true
})

export default trackingManager
```

## 高级配置

### 数据过滤和采样

```javascript
const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  
  // 采样率配置
  sampleRate: 0.1, // 只上报 10% 的数据
  
  // URL 过滤
  ignoreUrls: [
    /localhost/,
    /127\.0\.0\.1/,
    'https://admin.example.com'
  ],
  
  // 错误过滤
  ignoreErrors: [
    'Script error.',
    /chrome-extension/,
    'ResizeObserver loop limit exceeded'
  ],
  
  // 自定义过滤器
  dataFilter: (eventData) => {
    // 过滤敏感数据
    if (eventData.page?.url?.includes('/admin')) {
      return false
    }
    
    // 添加自定义字段
    eventData.environment = 'production'
    
    return eventData
  }
})
```

### 离线缓存

```javascript
const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  
  // 启用离线缓存
  enableOfflineCache: true,
  maxCacheSize: 100, // 最大缓存事件数
  
  // 网络恢复时自动发送缓存数据
  autoFlushOnOnline: true
})

// 手动刷新缓存
tracker.flushCache()
```

### 自定义上报器

```javascript
class CustomSender {
  async send(url, data, options) {
    // 自定义发送逻辑
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return response.json()
  }
}

const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  customSender: new CustomSender()
})
```

## 性能优化建议

### 1. 延迟初始化

```javascript
// 页面关键资源加载完成后再初始化
window.addEventListener('load', () => {
  const tracker = new TrackingSDK({
    endpoint: 'https://your-api.com/api/tracking/events'
  })
  
  // 将 tracker 挂载到全局
  window.tracker = tracker
})
```

### 2. 异步加载

```javascript
// 异步加载 SDK
async function loadTrackingSDK() {
  const { TrackingSDK } = await import('@tracking-system/sdk')
  
  return new TrackingSDK({
    endpoint: 'https://your-api.com/api/tracking/events'
  })
}

loadTrackingSDK().then(tracker => {
  // 使用 tracker
})
```

### 3. 代码分割

```javascript
// 使用动态导入实现代码分割
const initTracking = async () => {
  if (shouldEnableTracking()) {
    const { TrackingSDK } = await import(
      /* webpackChunkName: "tracking" */ '@tracking-system/sdk'
    )
    
    return new TrackingSDK({
      endpoint: 'https://your-api.com/api/tracking/events'
    })
  }
}
```

## 常见问题

### 1. 跨域问题

```javascript
// 使用 JSONP 方式避免跨域
const tracker = new TrackingSDK({
  endpoint: 'https://api.example.com/tracking/events',
  sender: 'jsonp' // 使用 JSONP 方式
})

// 或者配置 CORS
// 后端需要设置正确的 CORS 头
```

### 2. 数据丢失

```javascript
// 启用离线缓存和重试机制
const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  enableOfflineCache: true,
  maxRetries: 3,
  retryDelay: 1000
})
```

### 3. 性能影响

```javascript
// 使用批量上报和采样
const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  batchSize: 20,
  batchTimeout: 10000,
  sampleRate: 0.1 // 只上报 10% 的数据
})
```

## 下一步

现在你已经了解了如何在各种前端环境中集成埋点 SDK，接下来可以：

1. [查看 API 文档](../api/tracking.md) - 了解详细的接口说明
2. [浏览示例代码](../examples/basic.md) - 学习更多使用示例
3. [配置部署环境](../deployment/installation.md) - 部署到生产环境
4. [性能优化指南](../guide/performance.md) - 优化埋点性能
