# 基础用法示例

本文档提供埋点监控系统的基础使用示例，帮助你快速上手。

## 安装 SDK

```bash
npm install @tracking-system/sdk
```

## 基础初始化

### 最简配置

```javascript
import { TrackingSDK } from '@tracking-system/sdk'

const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events'
})
```

### 完整配置

```javascript
const tracker = new TrackingSDK({
  // 基础配置
  endpoint: 'http://localhost:3000/api/tracking/events',
  appVersion: '1.0.0',
  userId: 'user_123',
  sessionId: 'session_' + Date.now(),
  
  // 上报配置
  sender: 'fetch', // 上报方式: fetch | xhr | jsonp | image
  batchSize: 10, // 批量上报数量
  batchTimeout: 5000, // 批量上报超时时间(ms)
  
  // 功能开关
  enableErrorTracking: true, // 启用错误监控
  enablePerformanceTracking: true, // 启用性能监控
  enableAutoPageView: true, // 启用自动页面浏览埋点
  
  // 调试配置
  debug: process.env.NODE_ENV === 'development',
  console: true // 在控制台输出调试信息
})
```

## 基础埋点

### 1. 页面浏览埋点

```javascript
// 手动发送页面浏览埋点
tracker.track('page_view', {
  page: {
    title: document.title,
    url: location.href,
    referrer: document.referrer
  }
})

// 或者使用简化方法
tracker.pageView()
```

### 2. 点击事件埋点

```javascript
// 监听按钮点击
document.getElementById('submit-btn').addEventListener('click', (event) => {
  tracker.track('click', {
    spm: 'form.button.submit',
    element: {
      tagName: event.target.tagName,
      className: event.target.className,
      id: event.target.id,
      text: event.target.textContent.trim()
    },
    position: {
      x: event.clientX,
      y: event.clientY
    }
  })
})

// 使用简化方法
tracker.click('form.button.submit', {
  text: '提交按钮'
})
```

### 3. 自定义事件埋点

```javascript
// 业务相关的自定义事件
tracker.track('custom', {
  eventName: 'user_login',
  eventData: {
    loginMethod: 'email',
    success: true,
    duration: 1200
  }
})

// 或者使用专门的方法
tracker.custom('user_login', {
  loginMethod: 'email',
  success: true
})
```

## 常用场景示例

### 表单提交追踪

```javascript
// 表单提交成功
document.getElementById('contact-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  
  const formData = new FormData(event.target)
  const startTime = Date.now()
  
  try {
    // 发送表单数据
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: formData
    })
    
    if (response.ok) {
      // 提交成功埋点
      tracker.track('form_submit', {
        spm: 'contact.form.submit',
        formId: 'contact-form',
        success: true,
        duration: Date.now() - startTime,
        fields: Array.from(formData.keys())
      })
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    // 提交失败埋点
    tracker.track('form_submit', {
      spm: 'contact.form.submit',
      formId: 'contact-form',
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    })
  }
})
```

### 商品浏览追踪

```javascript
// 商品详情页浏览
function trackProductView(productId, productData) {
  tracker.track('product_view', {
    spm: 'product.detail.view',
    productId: productId,
    productData: {
      name: productData.name,
      category: productData.category,
      price: productData.price,
      brand: productData.brand
    },
    referrer: document.referrer
  })
}

// 商品加入购物车
function trackAddToCart(productId, quantity, price) {
  tracker.track('add_to_cart', {
    spm: 'product.button.add_cart',
    productId: productId,
    quantity: quantity,
    price: price,
    totalPrice: quantity * price
  })
}
```

### 视频播放追踪

```javascript
const video = document.getElementById('main-video')

// 播放开始
video.addEventListener('play', () => {
  tracker.track('video_play', {
    spm: 'video.player.play',
    videoId: video.dataset.videoId,
    currentTime: video.currentTime,
    duration: video.duration
  })
})

// 播放暂停
video.addEventListener('pause', () => {
  tracker.track('video_pause', {
    spm: 'video.player.pause',
    videoId: video.dataset.videoId,
    currentTime: video.currentTime,
    playedPercent: (video.currentTime / video.duration * 100).toFixed(2)
  })
})

// 播放结束
video.addEventListener('ended', () => {
  tracker.track('video_ended', {
    spm: 'video.player.ended',
    videoId: video.dataset.videoId,
    totalDuration: video.duration,
    completed: true
  })
})
```

## 错误监控示例

### 自动错误捕获

```javascript
// SDK 会自动捕获以下类型的错误：
// 1. JavaScript 运行时错误
// 2. Promise 拒绝错误
// 3. 资源加载错误

// 启用自动错误监控
const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  enableErrorTracking: true
})
```

### 手动错误上报

```javascript
// 手动捕获和上报错误
try {
  // 可能出错的代码
  const result = riskyFunction()
} catch (error) {
  tracker.trackError({
    type: 'custom_error',
    message: error.message,
    stack: error.stack,
    context: {
      function: 'riskyFunction',
      userId: getCurrentUserId(),
      timestamp: Date.now()
    },
    level: 'high'
  })
  
  // 重新抛出错误或处理
  throw error
}
```

### API 请求错误追踪

```javascript
// 封装 fetch 请求，自动追踪错误
async function apiRequest(url, options = {}) {
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // 成功请求埋点
    tracker.track('api_success', {
      url: url,
      method: options.method || 'GET',
      status: response.status,
      duration: Date.now() - startTime
    })
    
    return response
  } catch (error) {
    // 失败请求埋点
    tracker.trackError({
      type: 'network_error',
      message: `API request failed: ${error.message}`,
      url: url,
      method: options.method || 'GET',
      duration: Date.now() - startTime,
      level: 'medium'
    })
    
    throw error
  }
}
```

## 性能监控示例

### 页面加载性能

```javascript
// 页面加载完成后发送性能数据
window.addEventListener('load', () => {
  setTimeout(() => {
    const perfData = performance.getEntriesByType('navigation')[0]
    
    tracker.track('page_performance', {
      spm: 'page.performance.load',
      metrics: {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        totalLoadTime: perfData.loadEventEnd - perfData.fetchStart
      }
    })
  }, 0)
})
```

### 资源加载性能

```javascript
// 监控关键资源加载时间
function trackResourcePerformance() {
  const resources = performance.getEntriesByType('resource')
  
  resources.forEach(resource => {
    if (resource.name.includes('.js') || resource.name.includes('.css')) {
      tracker.track('resource_performance', {
        spm: 'resource.performance.load',
        resourceUrl: resource.name,
        resourceType: resource.name.includes('.js') ? 'javascript' : 'stylesheet',
        loadTime: resource.responseEnd - resource.startTime,
        size: resource.transferSize || resource.encodedBodySize
      })
    }
  })
}

// 页面加载完成后执行
window.addEventListener('load', trackResourcePerformance)
```

## 用户行为分析

### 页面滚动追踪

```javascript
let scrollTimer = null
let maxScrollPercent = 0

window.addEventListener('scroll', () => {
  // 防抖处理
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    )
    
    // 记录最大滚动百分比
    if (scrollPercent > maxScrollPercent) {
      maxScrollPercent = scrollPercent
      
      // 每滚动 25% 发送一次埋点
      if (scrollPercent > 0 && scrollPercent % 25 === 0) {
        tracker.track('page_scroll', {
          spm: 'page.scroll.depth',
          scrollPercent: scrollPercent,
          scrollY: window.scrollY
        })
      }
    }
  }, 100)
})

// 页面离开时发送最终滚动数据
window.addEventListener('beforeunload', () => {
  if (maxScrollPercent > 0) {
    tracker.track('page_scroll_final', {
      spm: 'page.scroll.final',
      maxScrollPercent: maxScrollPercent
    })
  }
})
```

### 页面停留时间

```javascript
let pageStartTime = Date.now()
let lastActiveTime = Date.now()

// 记录用户活跃时间
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    lastActiveTime = Date.now()
  }, { passive: true })
})

// 页面离开时计算停留时间
window.addEventListener('beforeunload', () => {
  const totalTime = Date.now() - pageStartTime
  const activeTime = lastActiveTime - pageStartTime
  
  tracker.track('page_duration', {
    spm: 'page.duration.leave',
    totalTime: totalTime,
    activeTime: activeTime,
    activePercent: Math.round((activeTime / totalTime) * 100)
  })
})
```

## 批量上报示例

```javascript
// 配置批量上报
const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  batchSize: 5, // 达到 5 个事件时自动发送
  batchTimeout: 3000, // 3 秒后强制发送
})

// 连续发送多个事件，会被自动批量处理
tracker.track('event1', { data: 'data1' })
tracker.track('event2', { data: 'data2' })
tracker.track('event3', { data: 'data3' })
tracker.track('event4', { data: 'data4' })
tracker.track('event5', { data: 'data5' }) // 触发批量发送

// 手动批量发送
const events = [
  { trigger: 'click', spm: 'home.button.1' },
  { trigger: 'click', spm: 'home.button.2' },
  { trigger: 'view', spm: 'home.banner.1' }
]

tracker.trackBatch(events)
```

## 调试和测试

### 开启调试模式

```javascript
const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  debug: true, // 开启调试模式
  console: true // 在控制台输出日志
})

// 调试模式下会输出详细的日志信息
tracker.track('test_event', { test: true })
// Console: [TrackingSDK] Sending event: test_event
// Console: [TrackingSDK] Event sent successfully: { id: 123, ... }
```

### 测试埋点数据

```javascript
// 创建测试用的追踪器
const testTracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  debug: true,
  userId: 'test_user_' + Date.now(),
  sessionId: 'test_session_' + Date.now()
})

// 发送测试数据
async function runTrackingTest() {
  console.log('开始埋点测试...')
  
  // 测试页面浏览
  await testTracker.track('page_view', {
    page: { title: '测试页面', url: 'http://test.com' }
  })
  
  // 测试点击事件
  await testTracker.track('click', {
    spm: 'test.button.click',
    element: { tagName: 'button', text: '测试按钮' }
  })
  
  // 测试自定义事件
  await testTracker.track('custom', {
    eventName: 'test_custom_event',
    eventData: { value: 123 }
  })
  
  console.log('埋点测试完成！')
}

// 运行测试
runTrackingTest()
```

## 下一步

现在你已经掌握了基础用法，可以继续学习：

- [高级配置](./advanced.md) - 更多高级功能和配置选项
- [错误监控](./error-tracking.md) - 详细的错误监控配置
- [自定义事件](./custom-events.md) - 如何创建自定义埋点事件
- [Vue.js 集成](./vue-integration.md) - Vue 项目集成指南
- [React.js 集成](./react-integration.md) - React 项目集成指南
