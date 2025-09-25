---
layout: home

hero:
  name: "埋点监控系统"
  text: "全栈埋点解决方案"
  tagline: 简单易用、功能强大的前端埋点监控平台
  image:
    src: /logo.svg
    alt: 埋点监控系统
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/basic

features:
  - icon: 🎯
    title: 精准追踪
    details: 支持点击、浏览、自定义等多种埋点事件类型，精确记录用户行为数据
  - icon: 🚀
    title: 多种上报方式
    details: 支持 JSONP、Image、XHR、Fetch 四种数据上报方式，适应不同场景需求
  - icon: 🛡️
    title: 错误监控
    details: 智能捕获 JavaScript 错误、Promise 拒绝等异常，提供完整的错误堆栈信息
  - icon: 📊
    title: 会话管理
    details: 自动管理用户会话，统计页面浏览、事件数量、错误次数等关键指标
  - icon: 🔧
    title: 灵活配置
    details: 支持自定义配置，可根据业务需求调整埋点策略和数据收集规则
  - icon: 📈
    title: 实时分析
    details: 提供实时数据分析接口，支持按时间、用户、页面等多维度查询统计
---

## 快速预览

### 🎯 简单集成

```javascript
import { TrackingSDK } from '@tracking-system/sdk'

// 初始化
const tracker = new TrackingSDK({
  endpoint: 'https://your-api.com/api/tracking/events',
  userId: 'user123',
  sessionId: 'session_xxx'
})

// 发送埋点
tracker.track('click', {
  spm: 'home.button.login',
  element: { tagName: 'button', text: '登录' }
})
```

### 🔄 智能错误捕获

```javascript
// 自动捕获 JavaScript 错误
window.addEventListener('error', (event) => {
  tracker.trackError({
    type: 'javascript_error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    stack: event.error?.stack
  })
})
```

### 📊 数据查询

```javascript
// 查询埋点数据
fetch('/api/tracking/events?startDate=2024-01-01&endDate=2024-01-31')
  .then(res => res.json())
  .then(data => console.log('埋点数据:', data))
```

## 核心特性

### 🎯 多维度数据收集

- **用户行为追踪**: 点击、浏览、停留时间等
- **页面性能监控**: 加载时间、资源加载状态
- **错误异常监控**: JavaScript 错误、网络异常
- **自定义事件**: 业务相关的特定事件

### 🚀 高性能设计

- **异步上报**: 不阻塞页面主线程
- **批量发送**: 减少网络请求次数
- **智能重试**: 网络异常时自动重试
- **数据压缩**: 最小化传输数据量

### 🛡️ 数据安全

- **数据加密**: 支持 HTTPS 传输
- **访问控制**: API 接口权限管理
- **数据脱敏**: 敏感信息自动处理
- **合规支持**: 符合数据保护法规

## 技术架构

```mermaid
graph TB
    A[前端应用] --> B[埋点SDK]
    B --> C[数据收集器]
    C --> D[API网关]
    D --> E[后端服务]
    E --> F[数据库]
    E --> G[分析引擎]
    G --> H[可视化面板]
```

## 开始使用

1. **安装依赖**
   ```bash
   npm install @tracking-system/sdk
   ```

2. **初始化配置**
   ```javascript
   import { TrackingSDK } from '@tracking-system/sdk'
   
   const tracker = new TrackingSDK({
     endpoint: 'your-api-endpoint',
     appVersion: '1.0.0'
   })
   ```

3. **发送埋点数据**
   ```javascript
   tracker.track('page_view', {
     page: { title: '首页', url: location.href }
   })
   ```

---

<div class="tip custom-block" style="padding-top: 8px">

想要了解更多？查看我们的 [快速开始指南](./guide/getting-started.md) 或者浏览 [API 文档](./api/tracking.md)。

</div>
