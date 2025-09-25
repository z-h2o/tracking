# 埋点接口 API

埋点接口是系统的核心 API，用于接收和处理前端发送的埋点数据。

## 基础信息

- **Base URL**: `http://localhost:3000/api/tracking`
- **Content-Type**: `application/json` (POST 请求)
- **字符编码**: UTF-8

## 接口列表

### 1. 发送埋点事件

#### POST `/events`

接收埋点事件数据，支持单个事件和批量事件。

**请求方式**：
- POST (JSON)
- GET (JSONP/Image)

**请求参数**：

| 字段 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| timestamp | number | ✅ | 事件时间戳(毫秒) | `1704067200000` |
| url | string | ✅ | 页面URL | `"https://example.com/page"` |
| sessionId | string | ✅ | 会话ID | `"session_123456"` |
| userId | string | ❌ | 用户ID | `"user_123"` |
| category | string | ❌ | 事件类别 | `"default"` 或 `"error"` |
| trigger | string | ❌ | 触发类型 | `"click"`, `"view"`, `"custom"` |
| sender | string | ❌ | 上报方式 | `"fetch"`, `"xhr"`, `"jsonp"`, `"image"` |
| appVersion | string | ❌ | 应用版本 | `"1.0.0"` |
| spm | string | ❌ | SPM埋点标识 | `"home.button.login"` |

**页面信息** (`page` 对象)：

```json
{
  "page": {
    "title": "页面标题",
    "referrer": "来源页面URL",
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

**用户信息** (`user` 对象)：

```json
{
  "user": {
    "userAgent": "Mozilla/5.0...",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai"
  }
}
```

**元素信息** (`element` 对象)：

```json
{
  "element": {
    "tagName": "button",
    "className": "btn btn-primary",
    "id": "login-btn",
    "text": "登录",
    "attributes": {
      "data-track": "login"
    }
  }
}
```

**位置信息** (`position` 对象)：

```json
{
  "position": {
    "x": 100,
    "y": 200,
    "width": 120,
    "height": 40
  }
}
```

**请求示例**：

```javascript
// 单个事件
POST /api/tracking/events
{
  "timestamp": 1704067200000,
  "url": "https://example.com/home",
  "sessionId": "session_123456",
  "userId": "user_123",
  "category": "default",
  "trigger": "click",
  "spm": "home.button.login",
  "page": {
    "title": "首页",
    "referrer": "https://example.com",
    "viewport": { "width": 1920, "height": 1080 }
  },
  "user": {
    "userAgent": "Mozilla/5.0...",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai"
  },
  "element": {
    "tagName": "button",
    "className": "btn-login",
    "text": "登录"
  },
  "position": { "x": 100, "y": 200 },
  "eventData": {
    "custom": "data"
  }
}

// 批量事件
POST /api/tracking/events
[
  { /* 事件1 */ },
  { /* 事件2 */ },
  { /* 事件3 */ }
]
```

**响应示例**：

```json
// 单个事件响应
{
  "success": true,
  "message": "Event tracked successfully",
  "data": {
    "type": "tracking",
    "id": 12345,
    "category": "default",
    "triggerType": "click"
  }
}

// 批量事件响应
{
  "success": true,
  "message": "Batch events processed successfully",
  "data": {
    "totalProcessed": 3,
    "trackingEvents": 2,
    "errorEvents": 1,
    "results": [
      { "type": "tracking", "id": 12345, "category": "default" },
      { "type": "tracking", "id": 12346, "category": "default" },
      { "type": "error", "id": 789, "category": "error" }
    ]
  }
}
```

### 2. JSONP 方式上报

#### GET `/events?data=...&callback=...`

通过 JSONP 方式发送埋点数据，适用于跨域场景。

**请求参数**：

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| data | string | ✅ | URL编码的JSON数据 |
| callback | string | ✅ | JSONP回调函数名 |

**请求示例**：

```javascript
// JavaScript 发送 JSONP 请求
const data = encodeURIComponent(JSON.stringify({
  timestamp: Date.now(),
  url: location.href,
  sessionId: 'session_123',
  trigger: 'click'
}))

const script = document.createElement('script')
script.src = `/api/tracking/events?data=${data}&callback=trackingCallback`
document.head.appendChild(script)

function trackingCallback(response) {
  console.log('埋点发送成功', response)
}
```

**响应**：
JSONP 请求不返回 JSON 响应，而是执行 JavaScript 回调函数。

### 3. 图片方式上报

#### GET `/events?data=...&t=...`

通过图片请求方式发送埋点数据，最轻量级的上报方式。

**请求参数**：

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| data | string | ✅ | URL编码的JSON数据 |
| t | number | ❌ | 时间戳（用于避免缓存） |

**请求示例**：

```javascript
// JavaScript 发送图片请求
const data = encodeURIComponent(JSON.stringify({
  timestamp: Date.now(),
  url: location.href,
  sessionId: 'session_123',
  trigger: 'click'
}))

const img = new Image()
img.src = `/api/tracking/events?data=${data}&t=${Date.now()}`
```

**响应**：
返回 1x1 像素的透明 PNG 图片。

### 4. 查询埋点事件

#### GET `/events`

查询埋点事件数据，支持多种筛选条件。

**查询参数**：

| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| startDate | string | 开始日期 | `2024-01-01` |
| endDate | string | 结束日期 | `2024-01-31` |
| sessionId | string | 会话ID | `session_123` |
| userId | string | 用户ID | `user_123` |
| triggerType | string | 触发类型 | `click` |
| spm | string | SPM标识 | `home.button` |
| pageUrl | string | 页面URL | `https://example.com` |
| page | number | 页码 | `1` |
| limit | number | 每页数量 | `20` |
| sortBy | string | 排序字段 | `created_at` |
| sortOrder | string | 排序方向 | `desc` |

**请求示例**：

```bash
GET /api/tracking/events?startDate=2024-01-01&endDate=2024-01-31&userId=user_123&page=1&limit=20
```

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "sessionId": "session_123",
      "userId": "user_123",
      "category": "default",
      "sender": "fetch",
      "eventTimestamp": 1704067200000,
      "pageUrl": "https://example.com/home",
      "pageTitle": "首页",
      "triggerType": "click",
      "spm": "home.button.login",
      "elementTagName": "button",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### 5. 获取单个事件

#### GET `/events/{id}`

根据ID获取单个埋点事件的详细信息。

**路径参数**：

| 参数 | 类型 | 描述 |
|------|------|------|
| id | number | 事件ID |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 12345,
    "sessionId": "session_123",
    "userId": "user_123",
    "appVersion": "1.0.0",
    "category": "default",
    "sender": "fetch",
    "eventTimestamp": 1704067200000,
    "pageUrl": "https://example.com/home",
    "pageTitle": "首页",
    "pageReferrer": "https://example.com",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "userAgent": "Mozilla/5.0...",
    "userLanguage": "zh-CN",
    "userTimezone": "Asia/Shanghai",
    "triggerType": "click",
    "spm": "home.button.login",
    "eventData": { "custom": "data" },
    "elementTagName": "button",
    "elementClassName": "btn-login",
    "elementId": "login-btn",
    "elementText": "登录",
    "elementAttributes": { "data-track": "login" },
    "positionX": 100,
    "positionY": 200,
    "positionWidth": 120,
    "positionHeight": 40,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": [
      {
        "field": "字段名",
        "message": "字段错误信息",
        "value": "错误的值"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/tracking/events",
  "method": "POST"
}
```

### 常见错误代码

| 错误代码 | HTTP状态码 | 描述 |
|----------|-----------|------|
| `VALIDATION_ERROR` | 400 | 数据验证失败 |
| `INVALID_CATEGORY` | 400 | 无效的事件类别 |
| `MISSING_REQUIRED_FIELD` | 400 | 缺少必填字段 |
| `INVALID_TIMESTAMP` | 400 | 无效的时间戳 |
| `INVALID_URL` | 400 | 无效的URL格式 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

## 限流规则

为防止滥用，API 实施了限流策略：

- **窗口时间**: 60 秒
- **最大请求数**: 1000 次/分钟/IP
- **批量事件**: 最多 100 个事件/请求
- **数据大小**: 最大 1MB/请求

超出限制时返回 HTTP 429 状态码。

## 性能优化建议

### 1. 批量发送

```javascript
// 推荐：批量发送多个事件
const events = [
  { /* 事件1 */ },
  { /* 事件2 */ },
  { /* 事件3 */ }
]
tracker.trackBatch(events)

// 不推荐：逐个发送
events.forEach(event => tracker.track(event))
```

### 2. 异步发送

```javascript
// 推荐：异步发送，不阻塞页面
tracker.track('click', data, { async: true })

// 使用 requestIdleCallback 在空闲时发送
requestIdleCallback(() => {
  tracker.track('page_view', data)
})
```

### 3. 数据压缩

```javascript
// 只发送必要的数据
tracker.track('click', {
  spm: 'home.button.login',
  // 避免发送大量无用数据
})
```

### 4. 离线缓存

```javascript
// SDK 自动处理离线场景
const tracker = new TrackingSDK({
  endpoint: '/api/tracking/events',
  enableOfflineCache: true, // 启用离线缓存
  maxCacheSize: 100 // 最大缓存事件数
})
```

## SDK 集成

详细的 SDK 集成方法请参考：

- [前端集成指南](../guide/frontend-integration.md)
- [Vue.js 集成](../examples/vue-integration.md)  
- [React.js 集成](../examples/react-integration.md)
- [原生 JavaScript 集成](../examples/vanilla-js.md)
