# 错误监控 API

错误监控 API 用于收集和管理前端应用中的 JavaScript 错误、Promise 拒绝等异常信息。

## 基础信息

- **Base URL**: `http://localhost:3000/api/tracking`
- **错误数据**: 自动路由到 `error_logs` 表
- **事件类别**: `category: "error"`

## 错误类型

系统支持多种类型的错误监控：

| 错误类型 | 描述 | 触发场景 |
|---------|------|---------|
| `javascript_error` | JavaScript 运行时错误 | `window.onerror` |
| `promise_rejection` | Promise 拒绝错误 | `unhandledrejection` |
| `resource_error` | 资源加载错误 | 图片、CSS、JS 加载失败 |
| `network_error` | 网络请求错误 | API 请求失败 |
| `custom_error` | 自定义错误 | 手动上报 |

## 接口详情

### 1. 发送错误日志

#### POST `/events` (通用接口)

通过通用埋点接口发送错误数据，系统会根据 `category: "error"` 自动路由到错误日志表。

**请求参数**：

| 字段 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| timestamp | number | ✅ | 错误时间戳(毫秒) | `1704067200000` |
| url | string | ✅ | 出错页面URL | `"https://example.com/page"` |
| sessionId | string | ✅ | 会话ID | `"session_123456"` |
| category | string | ✅ | 事件类别(固定为"error") | `"error"` |
| type | string | ✅ | 错误类型 | `"javascript_error"` |
| message | string | ✅ | 错误消息 | `"Uncaught TypeError: ..."` |
| stack | string | ❌ | 错误堆栈 | `"Error: ...\n at ..."` |
| reason | string | ❌ | 错误原因(Promise专用) | `"Promise rejected"` |
| level | string | ❌ | 错误级别 | `"high"`, `"medium"`, `"low"` |

**JavaScript 错误示例**：

```json
{
  "timestamp": 1704067200000,
  "url": "https://example.com/page",
  "sessionId": "session_123456",
  "userId": "user_123",
  "category": "error",
  "type": "javascript_error",
  "message": "Uncaught TypeError: Cannot read property 'foo' of undefined",
  "stack": "TypeError: Cannot read property 'foo' of undefined\n    at HTMLButtonElement.onClick (https://example.com/app.js:123:45)\n    at HTMLButtonElement.dispatch (https://example.com/jquery.js:456:78)",
  "page": {
    "title": "错误页面",
    "referrer": "https://example.com/home"
  },
  "user": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai"
  },
  "level": "high"
}
```

**Promise 拒绝错误示例**：

```json
{
  "timestamp": 1704067200000,
  "url": "https://example.com/page",
  "sessionId": "session_123456",
  "category": "error",
  "type": "promise_rejection",
  "message": "API request failed",
  "reason": "Network error: 500 Internal Server Error",
  "stack": "Error: API request failed\n    at fetch.then (https://example.com/api.js:67:89)",
  "level": "medium"
}
```

**响应示例**：

```json
{
  "success": true,
  "message": "Error tracked successfully",
  "data": {
    "type": "error",
    "id": 789,
    "category": "error",
    "errorType": "javascript_error"
  }
}
```

### 2. 专用错误接口

#### POST `/errors`

专门用于错误日志的接口，直接保存到错误日志表。

**请求示例**：

```json
{
  "sessionId": "session_123456",
  "userId": "user_123",
  "errorType": "javascript_error",
  "errorMessage": "Uncaught TypeError: Cannot read property 'foo' of undefined",
  "errorStack": "TypeError: Cannot read property 'foo' of undefined\n    at HTMLButtonElement.onClick",
  "pageUrl": "https://example.com/page",
  "pageTitle": "错误页面",
  "userAgent": "Mozilla/5.0...",
  "errorLevel": "high"
}
```

### 3. 查询错误日志

#### GET `/errors`

查询错误日志数据，支持多种筛选条件。

**查询参数**：

| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| startDate | string | 开始日期 | `2024-01-01` |
| endDate | string | 结束日期 | `2024-01-31` |
| errorType | string | 错误类型 | `javascript_error` |
| errorLevel | string | 错误级别 | `high` |
| resolved | boolean | 是否已解决 | `false` |
| sessionId | string | 会话ID | `session_123` |
| userId | string | 用户ID | `user_123` |
| pageUrl | string | 页面URL | `https://example.com` |
| page | number | 页码 | `1` |
| limit | number | 每页数量 | `20` |

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "sessionId": "session_123456",
      "userId": "user_123",
      "category": "error",
      "sender": "fetch",
      "errorTimestamp": 1704067200000,
      "errorType": "javascript_error",
      "errorMessage": "Uncaught TypeError: Cannot read property 'foo' of undefined",
      "errorStack": "TypeError: ...",
      "pageUrl": "https://example.com/page",
      "pageTitle": "错误页面",
      "errorLevel": "high",
      "resolved": false,
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

## 自动错误捕获

### 1. JavaScript 错误

```javascript
// 全局错误监听
window.addEventListener('error', (event) => {
  tracker.trackError({
    type: 'javascript_error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    level: 'high'
  })
})
```

### 2. Promise 拒绝

```javascript
// Promise 拒绝监听
window.addEventListener('unhandledrejection', (event) => {
  tracker.trackError({
    type: 'promise_rejection',
    message: event.reason?.message || 'Promise rejected',
    reason: String(event.reason),
    stack: event.reason?.stack,
    level: 'medium'
  })
})
```

### 3. 资源加载错误

```javascript
// 资源加载错误监听
window.addEventListener('error', (event) => {
  const target = event.target
  if (target !== window && target.tagName) {
    tracker.trackError({
      type: 'resource_error',
      message: `Failed to load ${target.tagName.toLowerCase()}: ${target.src || target.href}`,
      resource: {
        tagName: target.tagName,
        src: target.src || target.href,
        type: target.type || 'unknown'
      },
      level: 'low'
    })
  }
}, true) // 使用捕获阶段
```

### 4. 网络请求错误

```javascript
// Fetch 请求错误处理
const originalFetch = window.fetch
window.fetch = function(...args) {
  return originalFetch.apply(this, args)
    .catch(error => {
      tracker.trackError({
        type: 'network_error',
        message: `Fetch failed: ${error.message}`,
        url: args[0],
        stack: error.stack,
        level: 'medium'
      })
      throw error
    })
}
```

## SDK 集成示例

### 基础配置

```javascript
import { TrackingSDK } from '@tracking-system/sdk'

const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  enableErrorTracking: true, // 启用自动错误监控
  errorLevel: 'medium', // 默认错误级别
  maxStackTraceLength: 1000, // 最大堆栈长度
  ignoreErrors: [
    'Script error.', // 忽略跨域脚本错误
    'ResizeObserver loop limit exceeded' // 忽略特定错误
  ]
})
```

### 手动错误上报

```javascript
// 手动上报自定义错误
try {
  // 可能出错的代码
  riskyOperation()
} catch (error) {
  tracker.trackError({
    type: 'custom_error',
    message: error.message,
    stack: error.stack,
    context: {
      operation: 'riskyOperation',
      params: { id: 123 }
    },
    level: 'high'
  })
}
```

### Vue.js 错误处理

```javascript
// Vue 全局错误处理
const app = createApp(App)

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
```

### React.js 错误边界

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    tracker.trackError({
      type: 'react_error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: 'high'
    })
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>
    }
    return this.props.children
  }
}
```

## 错误分析

### 错误统计查询

```javascript
// 获取错误统计数据
fetch('/api/tracking/stats/errors?period=7d')
  .then(res => res.json())
  .then(data => {
    console.log('错误统计:', data)
    // {
    //   totalErrors: 150,
    //   errorsByType: {
    //     javascript_error: 80,
    //     promise_rejection: 45,
    //     resource_error: 25
    //   },
    //   errorsByLevel: {
    //     high: 30,
    //     medium: 70,
    //     low: 50
    //   }
    // }
  })
```

### 错误趋势分析

```javascript
// 获取错误趋势数据
fetch('/api/tracking/stats/errors/trend?period=30d&interval=1d')
  .then(res => res.json())
  .then(data => {
    // 绘制错误趋势图表
    drawErrorTrendChart(data)
  })
```

## 错误处理最佳实践

### 1. 错误级别定义

- **Critical**: 导致应用崩溃或核心功能不可用
- **High**: 影响主要功能，但应用仍可使用
- **Medium**: 影响次要功能或用户体验
- **Low**: 不影响功能，仅记录用于调试

### 2. 错误过滤

```javascript
const tracker = new TrackingSDK({
  errorFilter: (error) => {
    // 过滤掉不需要上报的错误
    if (error.message.includes('Script error.')) return false
    if (error.filename?.includes('chrome-extension://')) return false
    return true
  }
})
```

### 3. 错误上下文

```javascript
// 添加错误上下文信息
tracker.trackError({
  type: 'custom_error',
  message: error.message,
  context: {
    userId: getCurrentUserId(),
    route: getCurrentRoute(),
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    customData: getRelevantData()
  }
})
```

### 4. 错误聚合

相同类型的错误会被自动聚合，避免重复上报：

```javascript
const tracker = new TrackingSDK({
  errorDeduplication: true, // 启用错误去重
  deduplicationWindow: 60000 // 1分钟内相同错误只上报一次
})
```

## 相关文档

- [埋点接口 API](./tracking.md) - 通用埋点接口
- [会话管理 API](./session.md) - 用户会话管理
- [数据模型](./models/error-log.md) - 错误日志数据模型
- [前端集成指南](../guide/frontend-integration.md) - SDK 集成方法
