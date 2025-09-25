# 快速开始

本指南将帮助你快速搭建和使用埋点监控系统。

## 环境要求

### 后端服务

- **Node.js**: 16.0 或更高版本
- **MySQL**: 5.7 或更高版本
- **内存**: 至少 512MB RAM
- **存储**: 至少 1GB 可用空间

### 前端 SDK

- **浏览器**: 支持 ES6+ 的现代浏览器
- **框架**: 支持 Vue、React、Angular 或原生 JavaScript
- **TypeScript**: 可选，推荐使用

## 安装部署

### 1. 克隆项目

```bash
git clone https://github.com/your-org/tracking-system.git
cd tracking-system
```

### 2. 安装依赖

```bash
# 安装项目依赖
pnpm install

# 或者使用 npm
npm install
```

### 3. 数据库配置

创建 MySQL 数据库并执行初始化脚本：

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE tracking_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 执行数据库初始化脚本
mysql -u root -p tracking_system < apps/backend/src/scripts/new_schema.sql
```

### 4. 环境配置

在后端项目根目录创建 `.env` 文件：

```bash
# apps/backend/.env
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tracking_system

# 其他配置
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 5. 启动服务

```bash
# 启动后端服务
cd apps/backend
npm run dev

# 启动前端应用（新终端）
cd apps/frontend
npm run dev
```

服务启动后：
- 后端 API: http://localhost:3000
- 前端应用: http://localhost:5173

## 基础使用

### 1. 安装 SDK

```bash
npm install @tracking-system/sdk
```

### 2. 初始化 SDK

```javascript
import { TrackingSDK } from '@tracking-system/sdk'

// 创建追踪器实例
const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  appVersion: '1.0.0',
  userId: 'user_123',
  sessionId: 'session_' + Date.now(),
  
  // 可选配置
  sender: 'fetch', // 上报方式: fetch | xhr | jsonp | image
  enableErrorTracking: true, // 启用错误监控
  enablePerformanceTracking: true, // 启用性能监控
  batchSize: 10, // 批量上报大小
  batchTimeout: 5000 // 批量上报超时时间
})
```

### 3. 发送埋点数据

#### 页面浏览埋点

```javascript
// 页面加载时
tracker.track('page_view', {
  page: {
    title: document.title,
    url: location.href,
    referrer: document.referrer
  }
})
```

#### 点击事件埋点

```javascript
// 监听按钮点击
document.getElementById('login-btn').addEventListener('click', (event) => {
  tracker.track('click', {
    spm: 'home.button.login',
    element: {
      tagName: event.target.tagName,
      className: event.target.className,
      text: event.target.textContent,
      id: event.target.id
    },
    position: {
      x: event.clientX,
      y: event.clientY
    }
  })
})
```

#### 自定义事件埋点

```javascript
// 业务相关的自定义事件
tracker.track('custom', {
  eventName: 'purchase_completed',
  eventData: {
    productId: 'prod_123',
    amount: 99.99,
    currency: 'CNY'
  }
})
```

### 4. 错误监控

SDK 会自动捕获 JavaScript 错误，你也可以手动上报错误：

```javascript
// 手动上报错误
try {
  // 可能出错的代码
  throw new Error('Something went wrong')
} catch (error) {
  tracker.trackError({
    type: 'manual_error',
    message: error.message,
    stack: error.stack,
    level: 'high'
  })
}

// Promise 错误捕获
window.addEventListener('unhandledrejection', (event) => {
  tracker.trackError({
    type: 'promise_rejection',
    message: event.reason?.message || 'Promise rejected',
    reason: event.reason,
    stack: event.reason?.stack
  })
})
```

## Vue.js 集成示例

### 1. 创建插件

```javascript
// plugins/tracking.js
import { TrackingSDK } from '@tracking-system/sdk'

export default {
  install(app, options) {
    const tracker = new TrackingSDK({
      endpoint: options.endpoint || 'http://localhost:3000/api/tracking/events',
      appVersion: options.appVersion || '1.0.0',
      userId: options.userId,
      enableErrorTracking: true
    })

    // 全局属性
    app.config.globalProperties.$tracker = tracker
    
    // 组合式 API
    app.provide('tracker', tracker)
  }
}
```

### 2. 注册插件

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import TrackingPlugin from './plugins/tracking.js'

const app = createApp(App)

app.use(TrackingPlugin, {
  endpoint: 'http://localhost:3000/api/tracking/events',
  appVersion: '1.0.0',
  userId: 'user_123'
})

app.mount('#app')
```

### 3. 在组件中使用

```vue
<template>
  <div>
    <button @click="handleClick">点击按钮</button>
  </div>
</template>

<script setup>
import { inject } from 'vue'

const tracker = inject('tracker')

const handleClick = () => {
  tracker.track('click', {
    spm: 'page.button.example',
    element: { text: '点击按钮' }
  })
}

// 页面加载时发送埋点
onMounted(() => {
  tracker.track('page_view', {
    page: { title: '示例页面' }
  })
})
</script>
```

## React.js 集成示例

### 1. 创建 Hook

```javascript
// hooks/useTracking.js
import { useEffect, useRef } from 'react'
import { TrackingSDK } from '@tracking-system/sdk'

export const useTracking = (config) => {
  const trackerRef = useRef(null)

  useEffect(() => {
    if (!trackerRef.current) {
      trackerRef.current = new TrackingSDK({
        endpoint: 'http://localhost:3000/api/tracking/events',
        appVersion: '1.0.0',
        enableErrorTracking: true,
        ...config
      })
    }
  }, [config])

  return trackerRef.current
}
```

### 2. 在组件中使用

```javascript
// components/ExampleComponent.jsx
import React, { useEffect } from 'react'
import { useTracking } from '../hooks/useTracking'

const ExampleComponent = () => {
  const tracker = useTracking({
    userId: 'user_123'
  })

  useEffect(() => {
    // 页面加载埋点
    tracker?.track('page_view', {
      page: { title: '示例页面' }
    })
  }, [tracker])

  const handleClick = () => {
    tracker?.track('click', {
      spm: 'page.button.example',
      element: { text: '点击按钮' }
    })
  }

  return (
    <div>
      <button onClick={handleClick}>点击按钮</button>
    </div>
  )
}

export default ExampleComponent
```

## 验证安装

### 1. 检查后端服务

访问健康检查接口：

```bash
curl http://localhost:3000/api/health
```

应该返回：

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. 发送测试埋点

```bash
curl -X POST http://localhost:3000/api/tracking/events \
  -H "Content-Type: application/json" \
  -d '[{
    "timestamp": 1704067200000,
    "url": "http://localhost:5173/test",
    "sessionId": "test_session",
    "userId": "test_user",
    "trigger": "test",
    "category": "default"
  }]'
```

### 3. 查看数据

检查数据库中是否有数据：

```sql
SELECT COUNT(*) FROM tracking_events;
SELECT COUNT(*) FROM error_logs;
```

## 常见问题

### CORS 问题

如果遇到跨域问题，确保后端配置了正确的 CORS 设置：

```javascript
// apps/backend/src/middlewares/cors.js
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-domain.com'],
  credentials: true
}))
```

### 数据库连接问题

检查数据库配置和连接状态：

```bash
# 测试数据库连接
mysql -h localhost -u root -p -e "SELECT 1"
```

### 端口占用

如果端口被占用，修改配置文件中的端口号：

```bash
# 查看端口使用情况
lsof -i :3000
lsof -i :5173
```

## 下一步

现在你已经成功搭建了埋点监控系统！接下来可以：

1. [了解项目架构](./architecture.md) - 深入了解系统设计
2. [查看 API 文档](../api/tracking.md) - 学习所有可用接口
3. [浏览示例代码](../examples/basic.md) - 查看更多使用示例
4. [配置部署环境](../deployment/installation.md) - 部署到生产环境

如果遇到问题，可以查看 [常见问题解答](../faq.md) 或提交 Issue。
