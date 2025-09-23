// 前端埋点SDK
export class TrackingSDK {
  // 私有字段
  #config;
  #isStarted = false;
  #observers = new Map();
  #senders = {};
  #errorStats = {
    jsErrors: 0,
    promiseRejections: 0,
    resourceErrors: 0,
    networkErrors: 0,
    lastErrorTime: null
  };

  constructor(config = {}) {
    this.#config = {
      endpoint: 'https://example.com/track',
      sender: 'jsonp',
      jsonp: {
        callbackParam: 'callback',
        timeout: 50
      },
      storage: {
        enabled: true,
        key: 'tracking_data',
        maxSize: 100
      },
      // 错误监控配置
      errorMonitoring: {
        enabled: true,
        captureJSErrors: true,
        capturePromiseRejections: true,
        captureResourceErrors: false,
        captureNetworkErrors: true,
        maxErrorsPerSession: 50,
        errorSamplingRate: 1.0, // 0.0 - 1.0
        ignoreErrors: [], // 忽略的错误模式
        beforeErrorSend: (errorData) => errorData
      },
      // 日志输出到页面
      logToPage: false,
      // 是否启用发送失败时的降级方案
      fallbackSender: false,
      dataProcessor: (data) => data,
      beforeSend: (data) => data,
      afterSend: (response, data) => { },
      onError: (error, data) => { },
      ...config
    };
    console.log('埋点初始化开始');
    this.#init();
  }

  // 私有初始化方法
  #init() {
    if (typeof window === 'undefined') return;

    this.#setupSenders();
    this.#setupStorage();
    this.#bindEvents();
    this.#setupErrorMonitoring();
    console.log('埋点初始化完成');
    
  }

  // 私有方法：设置错误监控
  #setupErrorMonitoring() {
    if (!this.#config.errorMonitoring.enabled) return;

    // JavaScript 错误监控
    if (this.#config.errorMonitoring.captureJSErrors) {
      window.addEventListener('error', this.#handleJSError.bind(this));
    }

    // Promise rejection 监控
    if (this.#config.errorMonitoring.capturePromiseRejections) {
      window.addEventListener('unhandledrejection', this.#handlePromiseRejection.bind(this));
    }

    // 资源加载错误监控
    if (this.#config.errorMonitoring.captureResourceErrors) {
      window.addEventListener('error', this.#handleResourceError.bind(this), true);
    }

    this.#log('info', 'Error monitoring enabled');
  }

  // 私有方法：处理 JavaScript 错误
  #handleJSError(event) {
    if (!this.#shouldCaptureError()) return;

    const errorData = {
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    if (this.#isErrorIgnored(errorData)) return;

    this.#errorStats.jsErrors++;
    this.#errorStats.lastErrorTime = Date.now();
    this.#trackError(errorData);
  }

  // 私有方法：处理 Promise rejection
  #handlePromiseRejection(event) {
    if (!this.#shouldCaptureError()) return;

    const errorData = {
      type: 'promise_rejection',
      reason: event.reason?.toString() || 'Unknown reason',
      stack: event.reason?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    if (this.#isErrorIgnored(errorData)) return;

    this.#errorStats.promiseRejections++;
    this.#errorStats.lastErrorTime = Date.now();
    this.#trackError(errorData);
  }

  // 私有方法：处理资源加载错误
  #handleResourceError(event) {
    if (!this.#shouldCaptureError()) return;

    // 只处理资源加载错误，不处理脚本错误（避免重复）
    if (event.target !== window && event.target.tagName) {
      // 检查是否为SDK自身创建的资源（JSONP脚本或图片）
      if (event.target.hasAttribute('data-tracking-sdk-jsonp')) {
        console.log('跳过SDK自身JSONP脚本的资源错误上报');
        return;
      }
      
      if (event.target.hasAttribute('data-tracking-sdk-image')) {
        console.log('跳过SDK自身图片请求的资源错误上报');
        return;
      }

      const errorData = {
        type: 'resource_error',
        tagName: event.target.tagName.toLowerCase(),
        source: event.target.src || event.target.href,
        message: `Failed to load ${event.target.tagName.toLowerCase()}`,
        timestamp: Date.now(),
        url: window.location.href
      };

      if (this.#isErrorIgnored(errorData)) return;

      this.#errorStats.resourceErrors++;
      this.#errorStats.lastErrorTime = Date.now();
      this.#trackError(errorData);
    }
  }

  // 私有方法：检查是否应该捕获错误
  #shouldCaptureError() {
    // 采样率检查
    if (Math.random() > this.#config.errorMonitoring.errorSamplingRate) {
      return false;
    }

    // 错误数量限制检查
    const totalErrors = this.#errorStats.jsErrors + 
                       this.#errorStats.promiseRejections + 
                       this.#errorStats.resourceErrors;
    
    return totalErrors < this.#config.errorMonitoring.maxErrorsPerSession;
  }

  // 私有方法：检查错误是否应该被忽略
  #isErrorIgnored(errorData) {
    const ignorePatterns = this.#config.errorMonitoring.ignoreErrors;
    
    return ignorePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return errorData.message?.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(errorData.message || '');
      }
      return false;
    });
  }

  // 私有方法：追踪错误
  #trackError(errorData) {
    const processedData = this.#config.errorMonitoring.beforeErrorSend(errorData);
    if (!processedData) return;

    // 添加通用信息
    const trackingData = {
      ...processedData,
      category: 'error',
      page: this.#getPageInfo(),
      user: this.#getUser(),
      sessionId: this.#getSessionId()
    };

    this.#sendImmediately(trackingData);
    this.#log('warn', 'Error tracked:', trackingData);
  }

  // 私有方法：设置发送器
  #setupSenders() {
    this.#senders = {
      jsonp: this.#createJSONPSender(),
      image: this.#createImageSender(),
      xhr: this.#createXHRSender(),
      fetch: this.#createFetchSender()
    };
  }

  // 私有方法：创建JSONP发送器
  #createJSONPSender() {
    return (url, data) => {
      return new Promise((resolve, reject) => {
        const callbackName = 'tracking_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          cleanup();
          reject('JSONP request timeout');
          // JSONP失败时自动降级到图片请求
          if (this.#config.fallbackSender) {
            this.#senders.image(url, data).then(resolve).catch(reject);
          }
        }, this.#config.jsonp.timeout);

        const cleanup = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete window[callbackName];
        };

        window[callbackName] = (response) => {
          cleanup();
          resolve(response);
        };

        const params = new URLSearchParams();
        params.append('data', JSON.stringify(data));
        params.append(this.#config.jsonp.callbackParam, callbackName);
        
        // 设置crossOrigin属性，避免跨域相关的控制台错误
        script.crossOrigin = 'anonymous';
        script.src = `${url}?${params.toString()}`;
        // 添加SDK标识，防止资源错误误报
        script.setAttribute('data-tracking-sdk-jsonp', 'true');
        
        script.onerror = () => {
          cleanup();
          reject('JSONP request failed');
          // JSONP失败时自动降级到图片请求
          if (this.#config.fallbackSender) {
            this.#senders.image(url, data).then(resolve).catch(reject);
          }
        };

        document.head.appendChild(script);
      });
    };
  }

  // 私有方法：创建图片发送器
  #createImageSender() {
    return (url, data) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        // 图片埋点的超时时间设置更短，因为我们主要关心请求是否发出
        const timeout = setTimeout(() => {
          cleanup();
          // 超时也视为成功，因为请求已经发出，服务器应该已经收到数据
          resolve({ success: true, method: 'image', note: 'Request sent (timeout)' });
        }, 3000);

        const cleanup = () => {
          clearTimeout(timeout);
          img.onload = img.onerror = img.onabort = null;
          // 清理img引用，避免内存泄漏
          img.src = '';
        };

        img.onload = () => {
          cleanup();
          resolve({ success: true, method: 'image' });
        };

        img.onerror = () => {
          cleanup();
          // 这是因为图片埋点的特性：只要请求发出，服务器就能收到数据
          resolve({ success: true, method: 'image', note: 'Image request completed (data sent)' });
        };

        img.onabort = () => {
          cleanup();
          resolve({ success: true, method: 'image', note: 'Request aborted (data sent)' });
        };

        // 将数据编码到URL参数中
        const params = new URLSearchParams();
        params.append('data', encodeURIComponent(JSON.stringify(data)));
        params.append('t', Date.now()); // 防止缓存

        // 添加SDK标识，防止资源错误误报
        img.setAttribute('data-tracking-sdk-image', 'true');
        
        try {
          // 设置crossOrigin属性，避免跨域相关的控制台错误
          img.crossOrigin = 'anonymous';
          img.src = `${url}?${params.toString()}`;
        } catch {
          cleanup();
          // 即使设置src时出错，也认为是成功的，因为这通常意味着请求已经发出
          resolve({ success: true, method: 'image', note: 'Image src set (may have sent data)' });
        }
      });
    };
  }

  // 私有方法：创建XHR发送器
  #createXHRSender() {
    return (url, data) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                resolve({ success: true });
              }
            } else {
              const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
              reject(error);
            }
          }
        };

        xhr.onerror = () => {
          const error = new Error('Network error');
          reject(error);
        };
        
        xhr.ontimeout = () => {
          const error = new Error('Request timeout');
          reject(error);
        };
        
        xhr.timeout = 10000;

        xhr.send(JSON.stringify(data));
      });
    };
  }

  // 私有方法：创建Fetch发送器
  #createFetchSender() {
    return (url, data) => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }).then(response => {
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          throw error;
        }
        return response.json().catch(() => ({ success: true }));
      }).catch(error => {
        throw error;
      });
    };
  }

  // 私有方法：设置存储（简化版）
  #setupStorage() {
    if (!this.#config.storage.enabled) return;
    
    // 清理可能存在的旧存储数据
    try {
      localStorage.removeItem(this.#config.storage.key);
      this.#log('info', 'Storage initialized - immediate mode, no data restoration needed');
    } catch (e) {
      this.#log('error', 'Failed to initialize storage:', e);
    }
  }

  // 私有方法：保存到存储（简化版）
  #saveToStorage() {
    // 立即发送模式下无需保存队列数据
    this.#log('info', 'Save to storage called - no data to save in immediate mode');
  }

  // 私有方法：绑定事件
  #bindEvents() {
    // 页面卸载时保存数据
    window.addEventListener('beforeunload', () => {
      this.#saveToStorage();
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.#flush();
        this.#saveToStorage();
      }
    });
  }

  // 公共API：启动SDK
  start() {
    if (this.#isStarted) return;

    this.#isStarted = true;
    this.#setupClickTracking();
    this.#setupViewTracking();

    this.#log('info', 'TrackingSDK started');
  }

  // 公共API：停止SDK
  stop() {
    if (!this.#isStarted) return;

    this.#isStarted = false;
    this.#observers.forEach((observer, type) => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    });
    this.#observers.clear();

    this.#log('info', 'TrackingSDK stopped');
  }

  // 私有方法：设置点击追踪
  #setupClickTracking() {
    // 事件委托处理点击事件
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-spm]');
      if (target) {
        const triggerType = target.getAttribute('data-track-trigger') || 'click';
        if (triggerType === 'click') {
          this.#trackElement(target, event);
        }
      }
    }, true);
  }

  // 私有方法：设置浏览追踪
  #setupViewTracking() {
    // 使用MutationObserver监听DOM变化
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              this.#scanForViewTrackingElements(node);
            }
          });
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.#observers.set('mutation', mutationObserver);

    // 使用IntersectionObserver监听元素可见性
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const delay = parseInt(element.getAttribute('data-track-delay')) || 0;
          if (delay > 0) {
            setTimeout(() => {
              if (this.#isElementVisible(element)) {
                this.#trackElement(element);
              }
            }, delay);
          } else {
            this.#trackElement(element);
          }
        }
      });
    }, {
      threshold: 0.1, // 10%可见时触发
      rootMargin: '50px' // 提前50px触发
    });

    // 先保存IntersectionObserver，再进行扫描
    this.#observers.set('intersection', intersectionObserver);
    // 现在进行初始扫描现有元素
    this.#scanForViewTrackingElements(document.body);
  }

  // 私有方法：扫描浏览追踪元素
  #scanForViewTrackingElements(root) {
    const elements = root.querySelectorAll('[data-spm][data-track-trigger="view"]');
    elements.forEach((element) => {
      const intersectionObserver = this.#observers.get('intersection');
      if (intersectionObserver) {
        intersectionObserver.observe(element);
      } else {
        console.error('IntersectionObserver未找到');
      }
    });

    // 也检查root元素本身
    if (root.hasAttribute && root.hasAttribute('data-spm') && root.getAttribute('data-track-trigger') === 'view') {
      const intersectionObserver = this.#observers.get('intersection');
      if (intersectionObserver) {
        intersectionObserver.observe(root);
      }
    }
  }

  // 私有方法：检查元素是否可见
  #isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  // 私有方法：追踪元素
  #trackElement(element, event = null) {
    const spm = element.getAttribute('data-spm');
    if (!spm) return;

    const data = this.#buildTrackingData(element, event);
    this.#sendImmediately(data);
  }

  // 私有方法：获取页面信息
  #getPageInfo() {
    return {
      title: document.title,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }
  }

  // 私有方法：获取用户信息
  #getUser() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  // 私有方法：获取会话ID
  #getSessionId() {
    if (!this._sessionId) {
      this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    return this._sessionId;
  }

  // 私有方法：立即发送数据
  #sendImmediately(data, options = {}) {
    if (!data) return;

    const processedData = this.#config.beforeSend(data);
    if (!processedData) return;

    const item = {
      data: processedData,
      timestamp: Date.now(),
      attempts: 0,
      options
    };

    this.#log('info', 'Sending immediately:', processedData);

    this.#sendData([item]);
  }

  // 私有方法：构建追踪数据
  #buildTrackingData(element, event = null) {
    const rect = element.getBoundingClientRect();

    const data = {
      spm: element.getAttribute('data-spm'),
      timestamp: Date.now(),
      url: window.location.href,

      element: {
        tagName: element.tagName.toLowerCase(),
        className: element.className || '',
        id: element.id || '',
        text: element.textContent?.substring(0, 100) || '',
        attributes: this.#getCustomAttributes(element)
      },

      position: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },

      page: this.#getPageInfo(),

      user: this.#getUser(),

      trigger: element.getAttribute('data-track-trigger') || 'click',
      custom: {},
      sessionId: this.#getSessionId()
    };

    // 添加事件信息
    if (event) {
      data.event = {
        type: event.type,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button
      };
    }

    return this.#config.dataProcessor(data);
  }

  // 私有方法：获取自定义属性
  #getCustomAttributes(element) {
    const attributes = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-track-') && attr.name !== 'data-track-trigger' && attr.name !== 'data-track-delay') {
        const key = attr.name.replace('data-track-', '');
        attributes[key] = attr.value;
      }
    });
    return attributes;
  }

  // 公共API：手动追踪事件
  track(eventData, options = {}) {
    console.log('track 方法被调用，事件数据:', eventData);
    this.#sendImmediately(eventData, options);
  }

  // 公共API：主动发送追踪数据
  sendTrack(data = {}) {
    console.log('sendTrack 被调用，传入数据:', data);
    // 组装基本数据
    const value = this.#adaptorData(data);
    console.log('适配后的数据:', value);
    this.track(value);
  }

  // 私有方法：适配数据
  #adaptorData(data) {
    return {
      page: this.#getPageInfo(),
      user: this.#getUser(),
      ...data,
      // 主动调用
      trigger: 'manual',
      sessionId: this.#getSessionId()
    }
  }


  // 私有方法：发送数据
  #sendData(items) {
    if (!items || items.length === 0) return;

    const sender = this.#senders[this.#config.sender];
    
    if (!sender) {
      this.#log('error', 'Invalid sender type:', this.#config.sender);
      return;
    }

    const data = items.map(item => item.data);
    const startTime = Date.now();

    sender(this.#config.endpoint, data)
      .then(response => {
        this.#handleSendSuccess(response, items, Date.now() - startTime);
      })
      .catch(error => {
        this.#handleSendError(error, items);
      })
      .finally(() => {
        // 执行完毕
      });
  }

  // 私有方法：处理发送成功
  #handleSendSuccess(response, items, duration) {

    this.#log('info', `Sent ${items.length} items successfully in ${duration}ms`);

    items.forEach(item => {
      this.#config.afterSend(response, item.data);
      if (item.options.onSuccess) {
        item.options.onSuccess(response);
      }
    });
  }

  // 私有方法：处理发送错误
  #handleSendError(error, items) {

    this.#log('error', 'Send failed:', error.message);
    
    items.forEach(item => {
      this.#config.onError(error, item.data);
      if (item.options.onError) {
        item.options.onError(error);
      }
    });
  }

  // 私有方法：刷新队列（简化版，无队列逻辑）
  #flush() {
    this.#log('info', 'Flush called - no queue to flush in immediate mode');
  }


  // 公共API：更新配置
  updateConfig(newConfig) {
    this.#config = { ...this.#config, ...newConfig };
    this.#log('info', 'Updated config:', newConfig);
  }

  // 公共API：获取统计信息
  getStats() {
    return { 
      errorStats: { ...this.#errorStats }
    };
  }

  // 私有方法：请求空闲回调
  #requestIdleCallback(callback) {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(callback, { timeout: 1000 });
    } else {
      setTimeout(callback, 0);
    }
  }

  // 私有方法：日志输出
  #log(level, message, ...args) {
    if (!this.#config.logToPage) return;

    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console[level](logMessage, ...args);
  }

  // 私有方法：生成或获取元素的唯一追踪 ID
  #getElementTrackingId(element) {
    const existingId = element.getAttribute('data-spm-id');
    if (existingId) return existingId;

    // 生成唯一 ID: spm_{spm值}_{时间戳}_{随机数}
    const spm = element.getAttribute('data-spm') || 'unknown';
    const id = `spm_${spm}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    element.setAttribute('data-spm-id', id);
    return id;
  }

  // 公共API：刷新队列（立即发送所有待发送数据）
  flush() {
    this.#flush();
  }
}