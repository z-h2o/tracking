// 前端埋点SDK
import {
  TrackingConfig,
  TrackingData,
  ErrorData,
  ErrorStats,
  SendItem,
  SendOptions,
  SenderType,
  SenderFunction,
  IdleCallback,
  IdleCallbackId,
  IdleDeadline,
  TrackingElement
} from '../types/index';

export class TrackingSDK {
  // 私有字段
  private config: TrackingConfig;
  private isStarted = false;
  private observers = new Map<string, any>();
  private senders: Record<SenderType, SenderFunction> = {
    jsonp: () => Promise.resolve(),
    image: () => Promise.resolve(),
    xhr: () => Promise.resolve(),
    fetch: () => Promise.resolve()
  };
  private errorStats: ErrorStats = {
    jsErrors: 0,
    promiseRejections: 0,
    resourceErrors: 0,
    networkErrors: 0,
    lastErrorTime: null
  };

  // 发送优化相关字段
  private pendingQueue: SendItem[] = [];
  private idleCallbackId: IdleCallbackId | null = null;
  
  // 会话ID字段
  private _sessionId?: string;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = {
      endpoint: 'https://example.com/track',
      sender: 'jsonp',
      jsonp: {
        callbackParam: 'callback',
        timeout: 3000
      },
      // 错误监控配置
      errorMonitoring: {
        enabled: true,
        captureJSErrors: true,
        capturePromiseRejections: true,
        captureResourceErrors: false,
        captureNetworkErrors: true,
        maxErrorsPerSession: 50,
        errorSamplingRate: 1.0,
        ignoreErrors: [],
        beforeErrorSend: (errorData: ErrorData) => errorData
      },
      // 日志输出到页面
      logToPage: false,
      // 是否启用发送失败时的降级方案
      fallbackSender: false,
      dataProcessor: (data: TrackingData) => data,
      beforeSend: (data: TrackingData) => data,
      afterSend: (response: any, data: TrackingData) => { },
      onError: (error: Error, data: TrackingData) => { },
      idleBatchSize: 5,
      ...config
    } as TrackingConfig;

    this.init();
  }

  // 私有初始化方法
  private init() {
    if (typeof window === 'undefined') return;

    this.setupSenders();
    this.setupErrorMonitoring();
    console.log('埋点初始化完成');
    
  }

  // 私有方法：设置错误监控
  private setupErrorMonitoring() {
    if (!this.config.errorMonitoring.enabled) return;

    // JavaScript 错误监控
    if (this.config.errorMonitoring.captureJSErrors) {
      window.addEventListener('error', this.handleJSError.bind(this));
    }

    // Promise rejection 监控
    if (this.config.errorMonitoring.capturePromiseRejections) {
      window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }

    // 资源加载错误监控
    if (this.config.errorMonitoring.captureResourceErrors) {
      window.addEventListener('error', this.handleResourceError.bind(this), true);
    }

    this.log('info', 'Error monitoring enabled');
  }

  // 私有方法：处理 JavaScript 错误
  private handleJSError(event: ErrorEvent) {
    if (!this.shouldCaptureError()) return;

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

    if (this.isErrorIgnored(errorData)) return;

    this.errorStats.jsErrors++;
    this.errorStats.lastErrorTime = Date.now();
    this.trackError(errorData);
  }

  // 私有方法：处理 Promise rejection
  private handlePromiseRejection(event: PromiseRejectionEvent) {
    if (!this.shouldCaptureError()) return;

    const errorData: ErrorData = {
      type: 'promise_rejection',
      message: event.reason?.toString() || 'Unknown reason',
      reason: event.reason?.toString() || 'Unknown reason',
      stack: event.reason?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    if (this.isErrorIgnored(errorData)) return;

    this.errorStats.promiseRejections++;
    this.errorStats.lastErrorTime = Date.now();
    this.trackError(errorData);
  }

  // 私有方法：处理资源加载错误
  private handleResourceError(event: ErrorEvent) {
    if (!this.shouldCaptureError()) return;

    // 只处理资源加载错误，不处理脚本错误（避免重复）
    const target = event.target as TrackingElement;
    if (target && target !== (window as any) && target.tagName) {
      // 检查是否为SDK自身创建的资源（JSONP脚本或图片）
      if (target.hasAttribute('data-tracking-sdk-jsonp')) {
        console.log('跳过SDK自身JSONP脚本的资源错误上报');
        return;
      }
      
      if (target.hasAttribute('data-tracking-sdk-image')) {
        console.log('跳过SDK自身图片请求的资源错误上报');
        return;
      }

      const errorData: ErrorData = {
        type: 'resource_error',
        tagName: target.tagName.toLowerCase(),
        source: (target as any).src || (target as any).href,
        message: `Failed to load ${target.tagName.toLowerCase()}`,
        timestamp: Date.now(),
        url: window.location.href
      };

      if (this.isErrorIgnored(errorData)) return;

      this.errorStats.resourceErrors++;
      this.errorStats.lastErrorTime = Date.now();
      this.trackError(errorData);
    }
  }

  // 私有方法：检查是否应该捕获错误
  private shouldCaptureError() {
    // 采样率检查
    if (Math.random() > this.config.errorMonitoring.errorSamplingRate) {
      return false;
    }

    // 错误数量限制检查
    const totalErrors = this.errorStats.jsErrors + 
                       this.errorStats.promiseRejections + 
                       this.errorStats.resourceErrors;
    
    return totalErrors < this.config.errorMonitoring.maxErrorsPerSession;
  }

  // 私有方法：检查错误是否应该被忽略
  private isErrorIgnored(errorData: ErrorData): boolean {
    const ignorePatterns = this.config.errorMonitoring.ignoreErrors;
    
    return ignorePatterns.some((pattern: string | RegExp) => {
      if (typeof pattern === 'string') {
        return errorData.message?.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(errorData.message || '');
      }
      return false;
    });
  }

  // 私有方法：追踪错误
  private trackError(errorData: ErrorData): void {
    const processedData = this.config.errorMonitoring.beforeErrorSend(errorData);
    if (!processedData) return;

    // 添加通用信息
    const trackingData = {
      ...processedData,
      category: 'error',
      page: this.getPageInfo(),
      user: this.getUser(),
      sessionId: this.getSessionId()
    };

    this.sendImmediately(trackingData);
    this.log('warn', 'Error tracked:', trackingData);
  }

  // 私有方法：设置发送器
  private setupSenders() {
    this.senders = {
      jsonp: this.createJSONPSender(),
      image: this.createImageSender(),
      xhr: this.createXHRSender(),
      fetch: this.createFetchSender()
    };
  }

  // 私有方法：创建JSONP发送器
  private createJSONPSender(): SenderFunction {
    return (url: string, data: TrackingData | TrackingData[]) => {
      return new Promise((resolve) => {
        const callbackName = 'tracking_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          cleanup();
          // JSONP失败时自动降级到图片请求
          if (this.config.fallbackSender) {
            this.senders.image(url, data).then(resolve)
          }
        }, this.config.jsonp.timeout);

        const cleanup = () => {
          clearTimeout(timeout);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete (window as any)[callbackName];
        };

        (window as any)[callbackName] = (response: any) => {
          cleanup();
          resolve(response);
        };

        const params = new URLSearchParams();
        params.append('data', JSON.stringify(data));
        params.append(this.config.jsonp.callbackParam, callbackName);
        
        // 设置crossOrigin属性，避免跨域相关的控制台错误
        script.crossOrigin = 'anonymous';
        script.src = `${url}?${params.toString()}`;
        // 添加SDK标识，防止资源错误误报
        script.setAttribute('data-tracking-sdk-jsonp', 'true');
        
        script.onerror = () => {
          cleanup();
          // JSONP失败时自动降级到图片请求
          if (this.config.fallbackSender) {
            this.senders.image(url, data).then(resolve)
          }
        };

        document.head.appendChild(script);
      });
    };
  }

  // 私有方法：创建图片发送器
  private createImageSender(): SenderFunction {
    return (url: string, data: TrackingData | TrackingData[]) => {
      return new Promise((resolve) => {
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
        params.append('t', Date.now().toString()); // 防止缓存

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
  private createXHRSender(): SenderFunction {
    return (url: string, data: TrackingData | TrackingData[]) => {
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
  private createFetchSender(): SenderFunction {
    return (url: string, data: TrackingData | TrackingData[]) => {
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

  // 公共API：启动SDK
  start() {
    if (this.isStarted) return;

    this.isStarted = true;
    this.setupClickTracking();
    this.setupViewTracking();

    this.log('info', 'TrackingSDK started');
  }

  // 公共API：停止SDK
  stop() {
    if (!this.isStarted) return;

    this.isStarted = false;
    this.observers.forEach((observer, type) => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers.clear();

    this.cancelIdleProcessing();

    this.log('info', 'TrackingSDK stopped');
  }

  // 私有方法：设置点击追踪
  private setupClickTracking() {
    // 事件委托处理点击事件
    document.addEventListener('click', (event) => {
      const target = (event.target as Element)?.closest('[data-spm]');
      if (target) {
        const triggerType = target.getAttribute('data-track-trigger') || 'click';
        if (triggerType === 'click') {
          this.trackElement(target, event);
        }
      }
    }, true);
  }

  // 私有方法：设置浏览追踪
  private setupViewTracking() {
    // 使用MutationObserver监听DOM变化
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node instanceof Element || node instanceof Document) {
                this.scanForViewTrackingElements(node);
              }
            }
          });
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.set('mutation', mutationObserver);

    // 使用IntersectionObserver监听元素可见性
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const delay = parseInt(element.getAttribute('data-track-delay') || '0') || 0;
          if (delay > 0) {
            setTimeout(() => {
              if (this.isElementVisible(element)) {
                this.trackElement(element);
              }
            }, delay);
          } else {
            this.trackElement(element);
          }
        }
      });
    }, {
      threshold: 0.1, // 10%可见时触发
      rootMargin: '50px' // 提前50px触发
    });

    // 先保存IntersectionObserver，再进行扫描
    this.observers.set('intersection', intersectionObserver);
    // 现在进行初始扫描现有元素
    this.scanForViewTrackingElements(document.body);
  }

  // 私有方法：扫描浏览追踪元素
  private scanForViewTrackingElements(root: Element | Document): void {
    const elements = root.querySelectorAll('[data-track-trigger="view"]');
    elements.forEach((element: Element) => {
      const intersectionObserver = this.observers.get('intersection');
      if (intersectionObserver) {
        intersectionObserver.observe(element);
      } else {
        console.error('IntersectionObserver未找到');
      }
    });

    // 也检查root元素本身
    if (root instanceof Element && root.hasAttribute('data-spm') && root.getAttribute('data-track-trigger') === 'view') {
      const intersectionObserver = this.observers.get('intersection');
      if (intersectionObserver) {
        intersectionObserver.observe(root);
      }
    }
  }

  // 私有方法：检查元素是否可见
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  // 私有方法：追踪元素
  private trackElement(element: Element, event: Event | null = null) {
    const spm = element.getAttribute('data-spm');
    if (!spm) return;

    const data = this.buildTrackingData(element, event);
    this.sendImmediately(data);
  }

  // 私有方法：获取页面信息
  private getPageInfo() {
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
  private getUser() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  // 私有方法：获取会话ID
  private getSessionId() {
    if (!this._sessionId) {
      this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    return this._sessionId;
  }

  // 私有方法：立即发送数据
  private sendImmediately(data: TrackingData, options: SendOptions = {}): void {
    if (!data) return;

    const processedData = this.config.beforeSend(data);
    if (!processedData) return;

    const item = {
      data: processedData,
      timestamp: Date.now(),
      attempts: 0,
      options
    };

    this.pendingQueue.push(item);
    this.log('info', 'Queued for idle send:', processedData);
    this.ensureIdleProcessing();
  }

  // 私有方法：构建追踪数据
  private buildTrackingData(element: Element | null = null, event: Event | null = null, eventData: any = {}) {
    const data = {
      timestamp: Date.now(),
      url: window.location.href,
      page: this.getPageInfo(),
      user: this.getUser(),
      trigger: 'manual',
      eventData,
      sessionId: this.getSessionId(),
      category: 'default'
    };
    
    if (element) {
      const rect = element.getBoundingClientRect();
      Object.assign(data, {
        spm: element.getAttribute('data-spm'),
        trigger: element.getAttribute('data-track-trigger') || 'click',
        position: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        element: {
          tagName: element.tagName.toLowerCase(),
          className: element.className || '',
          id: this.getElementTrackingId(element) || '',
          text: element.textContent?.substring(0, 100) || '',
          attributes: this.getCustomAttributes(element)
        }
      });
    }
    // 添加事件信息
    if (event) {
      const eventInfo: any = {
        type: event.type
      };
      
      // 检查是否为鼠标事件
      if ('clientX' in event && 'clientY' in event) {
        eventInfo.clientX = (event as MouseEvent).clientX;
        eventInfo.clientY = (event as MouseEvent).clientY;
      }
      
      if ('button' in event) {
        eventInfo.button = (event as MouseEvent).button;
      }
      
      (data as any).event = eventInfo;
    }

    return this.config.dataProcessor(data);
  }

  // 私有方法：获取自定义属性
  private getCustomAttributes(element: Element) {
    const attributes: any = {};
    Array.from(element.attributes).forEach((attr: Attr) => {
      if (attr.name.startsWith('data-track-') && attr.name !== 'data-track-trigger' && attr.name !== 'data-track-delay') {
        const key = attr.name.replace('data-track-', '');
        attributes[key] = attr.value;
      }
    });
    return attributes;
  }

  // 公共API：主动发送追踪数据
  sendTrack(data: any = {}) {
    const value = this.buildTrackingData(null, null, data);
    this.sendImmediately(value);
  }

  // 私有方法：发送数据
  private sendData(items: SendItem[]): void {
    if (!items || items.length === 0) return;

    const sender = this.senders[this.config.sender];
    
    if (!sender) {
      this.log('error', 'Invalid sender type:', this.config.sender);
      return;
    }

    const data = items.map((item: SendItem) => item.data);
    const startTime = Date.now();

    sender(this.config.endpoint, data)
      .then((response: any) => {
        this.handleSendSuccess(response, items, Date.now() - startTime);
      })
      .catch((error: Error) => {
        this.handleSendError(error, items);
      })
      .finally(() => {
        // 执行完毕
      });
  }

  // 私有方法：处理发送成功
  private handleSendSuccess(response: any, items: SendItem[], duration: number): void {

    this.log('info', `Sent ${items.length} items successfully in ${duration}ms`);

    items.forEach((item: SendItem) => {
      this.config.afterSend(response, item.data);
      if (item.options?.onSuccess) {
        item.options.onSuccess(response);
      }
    });
  }

  // 私有方法：处理发送错误
  private handleSendError(error: Error, items: SendItem[]): void {

    this.log('error', 'Send failed:', error.message);
    
    items.forEach((item: SendItem) => {
      this.config.onError(error, item.data);
      if (item.options?.onError) {
        item.options.onError(error);
      }
    });
  }

  // 公共API：更新配置
  updateConfig(newConfig: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...newConfig } as TrackingConfig;
    this.log('info', 'Updated config:', newConfig);
  }

  // 私有方法：请求空闲回调
  private requestIdleCallback(callback: IdleCallback): IdleCallbackId {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(callback, { timeout: 1000 });
    }

    return setTimeout(() => {
      callback({
        didTimeout: true,
        timeRemaining: () => 50
      });
    }, 0) as any;
  }

  private cancelIdleCallback(id: IdleCallbackId): void {
    if (id == null) return;

    if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  }

  private cancelIdleProcessing() {
    if (this.idleCallbackId !== null) {
      this.cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
  }

  private ensureIdleProcessing() {
    if (this.pendingQueue.length === 0) return;
    if (this.idleCallbackId !== null) return;

    this.idleCallbackId = this.requestIdleCallback((deadline: IdleDeadline) => {
      this.idleCallbackId = null;
      this.processQueueDuringIdle(deadline);
    });
  }

  private processQueueDuringIdle(deadline: IdleDeadline): void {
    if (this.pendingQueue.length === 0) return;

    const shouldContinue = () => {
      if (!deadline || typeof deadline.timeRemaining !== 'function') return true;
      return deadline.timeRemaining() > 1 || deadline.didTimeout;
    };

    const itemsToSend = [];

    while (this.pendingQueue.length > 0 && shouldContinue()) {
      const batchSize = Math.min(this.pendingQueue.length, this.getIdleBatchSize());
      const items = this.pendingQueue.splice(0, batchSize);
      itemsToSend.push(items);

      if (deadline && !deadline.didTimeout && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() <= 1) {
        break;
      }
    }

    itemsToSend.forEach(items => {
      this.sendData(items);
    });

    if (this.pendingQueue.length > 0) {
      this.ensureIdleProcessing();
    }
  }

  private getIdleBatchSize() {
    const size = this.config.idleBatchSize;
    if (typeof size === 'number' && size > 0) {
      return Math.max(1, Math.floor(size));
    }
    return 5;
  }

  // 私有方法：日志输出
  private log(level: string, message: string, ...args: any[]) {
    if (!this.config.logToPage) return;

    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // 类型安全的 console 调用
    switch (level) {
      case 'error':
        console.error(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'info':
        console.info(logMessage, ...args);
        break;
      default:
        console.log(logMessage, ...args);
        break;
    }
  }

  // 私有方法：生成或获取元素的唯一追踪 ID
  private getElementTrackingId(element: Element): string {
    const existingId = element.getAttribute('data-spm-id');
    if (existingId) return existingId;

    // 生成唯一 ID: spm_{spm值}_{时间戳}_{随机数}
    const spm = element.getAttribute('data-spm') || 'unknown';
    const id = `spm_${spm}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    element.setAttribute('data-spm-id', id);
    return id;
  }
}