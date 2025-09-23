# 埋点后台服务

一个基于 Node.js + Express + MySQL 的埋点数据收集和分析后台服务系统。

## 功能特性

- 🎯 **埋点数据收集**: 支持事件、页面访问、错误日志、用户信息的数据收集
- 📊 **数据分析**: 提供丰富的数据统计和分析API
- 🔄 **实时监控**: 实时数据统计和监控
- 🚀 **高性能**: 支持批量处理和并发请求
- 🛡️ **安全可靠**: 包含CORS、限流、数据验证等安全措施
- 📈 **可扩展**: 模块化设计，易于扩展和维护

## 技术栈

- **后端框架**: Express.js
- **数据库**: MySQL 5.7+
- **数据验证**: Joi
- **安全中间件**: Helmet, CORS
- **限流**: rate-limiter-flexible
- **日志**: Morgan
- **其他**: Compression, Moment.js

## 快速开始

### 1. 环境要求

- Node.js 14.0+
- MySQL 5.7+
- npm 或 yarn

### 2. 安装和配置

```bash
# 克隆项目（如果从Git获取）
git clone <repository-url>
cd tracking-backend

# 安装依赖
npm install

# 复制配置文件
cp .env.example .env

# 编辑配置文件，设置数据库连接信息
vim .env
```

### 3. 数据库设置

```bash
# 登录MySQL
mysql -u root -p

# 执行数据库脚本
source database/schema.sql
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后访问: http://localhost:3000

## API 文档

### SPM埋点数据收集 API（支持多种发送方式）

#### 1. JSONP方式发送（推荐）

**GET** `/api/spm/spm`

支持JSONP跨域请求，兼容多种callback参数名

参数:
- `data`: JSON字符串（URL编码）
- `callback`: JSONP回调函数名（也支持`jsonp`、`cb`）

```javascript
// 单条事件发送
const data = {
  event: 'button_click',
  properties: {
    button_text: '购买',
    product_id: '12345'
  }
};

const script = document.createElement('script');
script.src = `http://localhost:3000/api/spm/spm?data=${encodeURIComponent(JSON.stringify(data))}&callback=myCallback`;
document.head.appendChild(script);

function myCallback(response) {
  console.log(response);
}
```

```javascript
// 批量事件发送
const batchData = [
  {
    event: 'page_view',
    properties: { page: '/home' }
  },
  {
    event: 'scroll',
    properties: { depth: 50 }
  }
];

const script = document.createElement('script');
script.src = `http://localhost:3000/api/spm/spm?data=${encodeURIComponent(JSON.stringify(batchData))}&callback=myCallback`;
```

#### 1. 事件追踪

**POST** `/api/tracking/event`

记录用户行为事件

```json
{
  "event_name": "button_click",
  "event_category": "interaction",
  "user_id": "user_123",
  "session_id": "session_456",
  "page_url": "https://example.com/page",
  "page_title": "页面标题",
  "properties": {
    "button_text": "立即购买",
    "button_position": "header"
  }
}
```

#### 2. 页面访问追踪

**POST** `/api/tracking/pageview`

记录页面访问数据

```json
{
  "user_id": "user_123",
  "session_id": "session_456",
  "page_url": "https://example.com/product/123",
  "page_title": "产品详情页",
  "referrer": "https://example.com/search",
  "duration": 45,
  "scroll_depth": 80.5
}
```

#### 3. 错误日志收集

**POST** `/api/tracking/error`

收集前端错误信息

```json
{
  "user_id": "user_123",
  "session_id": "session_456",
  "error_type": "javascript_error",
  "error_message": "Cannot read property 'length' of undefined",
  "error_stack": "Error: Cannot read property...",
  "page_url": "https://example.com/page"
}
```

#### 4. 用户信息更新

**POST** `/api/tracking/user`

更新用户基础信息

```json
{
  "user_id": "user_123",
  "device_id": "device_456",
  "platform": "web",
  "user_agent": "Mozilla/5.0..."
}
```

#### 5. 批量数据处理

**POST** `/api/tracking/batch`

批量提交多种类型的埋点数据

```json
{
  "data": [
    {
      "type": "event",
      "data": { /* 事件数据 */ }
    },
    {
      "type": "pageView",
      "data": { /* 页面访问数据 */ }
    }
  ]
}
```

### 数据分析 API

#### 1. 事件统计

**GET** `/api/analytics/events`

获取事件统计数据

参数:
- `startDate`: 开始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)
- `eventName`: 事件名称
- `eventCategory`: 事件分类
- `userId`: 用户ID

#### 2. 页面访问统计

**GET** `/api/analytics/pageviews`

获取页面访问统计

参数:
- `startDate`: 开始日期
- `endDate`: 结束日期
- `pageUrl`: 页面URL（支持模糊搜索）
- `userId`: 用户ID

#### 3. 用户行为路径

**GET** `/api/analytics/user-journey/:userId`

获取指定用户的行为路径

参数:
- `sessionId`: 会话ID（可选）

#### 4. 趋势数据

**GET** `/api/analytics/trends`

获取数据趋势

参数:
- `startDate`: 开始日期
- `endDate`: 结束日期
- `granularity`: 时间粒度 (hour/day/month)

#### 5. 实时数据

**GET** `/api/analytics/realtime`

获取实时统计数据

#### 6. 热门页面

**GET** `/api/analytics/top-pages`

获取热门页面排行

参数:
- `startDate`: 开始日期
- `endDate`: 结束日期
- `limit`: 返回数量 (默认10)

#### 7. 用户留存

**GET** `/api/analytics/retention/:cohortDate`

获取用户留存数据

#### 8. 错误统计

**GET** `/api/analytics/errors`

获取错误统计数据

#### 9. 数据概览

**GET** `/api/analytics/overview`

获取数据概览信息

## 配置说明

### 环境变量 (.env)

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tracking_system

# CORS配置
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# 限流配置
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

## 数据库表结构

### 主要表说明

- **users**: 用户基础信息
- **events**: 事件记录表
- **event_properties**: 事件属性表
- **page_views**: 页面访问记录
- **error_logs**: 错误日志表
- **daily_stats**: 每日统计汇总

详细的表结构请查看 `database/schema.sql`

## 客户端集成示例

### JavaScript SDK 示例

```javascript
class TrackingSDK {
  constructor(apiUrl, userId) {
    this.apiUrl = apiUrl;
    this.userId = userId;
    this.sessionId = this.generateSessionId();
  }

  // 发送事件
  async trackEvent(eventName, properties = {}) {
    return this.send('/api/tracking/event', {
      event_name: eventName,
      user_id: this.userId,
      session_id: this.sessionId,
      page_url: window.location.href,
      page_title: document.title,
      properties: properties
    });
  }

  // 发送页面访问
  async trackPageView() {
    return this.send('/api/tracking/pageview', {
      user_id: this.userId,
      session_id: this.sessionId,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer
    });
  }

  // 发送错误
  async trackError(error) {
    return this.send('/api/tracking/error', {
      user_id: this.userId,
      session_id: this.sessionId,
      error_type: error.name,
      error_message: error.message,
      error_stack: error.stack,
      page_url: window.location.href
    });
  }

  async send(endpoint, data) {
    try {
      const response = await fetch(this.apiUrl + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('埋点发送失败:', error);
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// 使用示例
const tracker = new TrackingSDK('http://localhost:3000', 'user_123');

// 页面加载时发送页面访问
tracker.trackPageView();

// 按钮点击事件
document.getElementById('buy-button').addEventListener('click', () => {
  tracker.trackEvent('button_click', {
    button_text: '立即购买',
    product_id: 'product_123'
  });
});

// 全局错误捕获
window.addEventListener('error', (event) => {
  tracker.trackError({
    name: 'javascript_error',
    message: event.message,
    stack: event.error?.stack
  });
});
```

## 性能优化建议

### 1. 数据库优化

- 为高频查询字段添加索引
- 定期清理历史数据
- 使用数据分表策略处理大数据量

### 2. 服务器优化

- 使用Redis缓存热点数据
- 实现数据异步处理队列
- 配置负载均衡

### 3. 监控和告警

- 监控API响应时间
- 监控数据库连接状态
- 设置错误告警阈值

## 部署说明

### Docker 部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 部署

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name tracking-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs tracking-backend
```

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接配置信息
   - 确认网络连通性

2. **API请求失败**
   - 检查CORS配置
   - 验证请求数据格式
   - 查看服务器日志

3. **性能问题**
   - 检查数据库查询性能
   - 监控内存使用情况
   - 分析慢查询日志

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- Email: your-email@example.com
- GitHub Issues: [项目Issues页面]
- 文档: [在线文档链接]