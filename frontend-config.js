// 前端SDK配置示例 - 对接后端API
const trackingConfig = {
  // 后端接口地址
  endpoint: 'http://localhost:3000/api/spm/spm',
  
  // 发送方式配置
  sender: 'jsonp', // 支持: jsonp, image, xhr, fetch
  
  // JSONP配置
  jsonp: {
    callbackParam: 'callback', // 后端支持 callback, jsonp, cb
    timeout: 5000
  },
  
  // 批量配置
  batch: {
    enabled: true,
    maxSize: 20, // 后端限制最大100条
    maxWait: 1000 // 1秒
  },
  
  // 重试配置
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoff: 'exponential',
    baseDelay: 1000
  },
  
  // 存储配置
  storage: {
    enabled: true,
    key: 'tracking_data',
    maxSize: 50
  },
  
  // 开启调试
  debug: true,
  
  // 降级方案
  fallbackSender: true,
  
  // 数据处理器 - 转换为后端期望的格式
  dataProcessor: (data) => {
    // 如果是SPM格式，直接返回
    if (data.spm && data.element && data.position && data.page) {
      return data;
    }
    
    // 转换为通用事件格式
    return {
      event: data.spm || 'unknown_event',
      properties: {
        spm_id: data.spm,
        trigger_type: data.trigger,
        element_tag: data.element?.tagName,
        element_class: data.element?.className,
        element_text: data.element?.text,
        page_url: data.page?.url || window.location.href,
        page_title: data.page?.title || document.title,
        position_x: data.position?.x,
        position_y: data.position?.y,
        viewport_width: data.page?.viewport?.width,
        viewport_height: data.page?.viewport?.height,
        user_language: data.user?.language,
        user_timezone: data.user?.timezone,
        timestamp: data.timestamp || Date.now(),
        ...data.custom // 其他自定义属性
      },
      timestamp: data.timestamp || Date.now()
    };
  }
};

// 使用示例
const tracker = new TrackingSDK(trackingConfig);

// 启动追踪
tracker.start();

// 手动发送事件
tracker.track({
  event: 'button_click',
  properties: {
    button_text: '购买',
    product_id: '12345',
    price: 99.99
  }
});

// 批量发送
tracker.trackBatch([
  {
    event: 'page_view',
    properties: {
      page_url: window.location.href,
      page_title: document.title
    }
  },
  {
    event: 'scroll',
    properties: {
      scroll_depth: 50,
      scroll_position: 1000
    }
  }
]);

// 监听统计数据
setInterval(() => {
  const stats = tracker.getStats();
  console.log('追踪统计:', stats);
}, 5000);

export { trackingConfig, tracker };