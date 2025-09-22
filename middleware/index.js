const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config/config');

// CORS中间件配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许没有origin的请求（比如移动端应用）
    if (!origin) return callback(null, true);
    
    if (config.cors.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS策略不允许此来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 请求日志中间件
const requestLogger = morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms', {
  skip: function (req, res) {
    // 跳过健康检查请求的日志
    return req.url === '/api/tracking/health';
  }
});

// 限流中间件
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  points: config.rateLimit.points, // 请求次数
  duration: config.rateLimit.duration, // 时间窗口（秒）
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: secs
    });
  }
};

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // CORS错误
  if (err.message === 'CORS策略不允许此来源') {
    return res.status(403).json({
      success: false,
      message: 'CORS策略不允许此来源'
    });
  }
  
  // 数据库连接错误
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({
      success: false,
      message: '数据库连接失败'
    });
  }
  
  // JSON解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'JSON格式错误'
    });
  }
  
  // 请求体过大
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: '请求体过大'
    });
  }
  
  // 默认错误响应
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(config.nodeEnv === 'development' && { error: err.message, stack: err.stack })
  });
};

// 404处理中间件
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.originalUrl
  });
};

// 请求体大小限制中间件
const bodySizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    req.on('data', (chunk) => {
      if (req.body && JSON.stringify(req.body).length > parseSize(limit)) {
        const err = new Error('请求体过大');
        err.type = 'entity.too.large';
        return next(err);
      }
    });
    next();
  };
};

// 解析大小字符串（如 '10mb'）
const parseSize = (size) => {
  if (typeof size === 'number') return size;
  
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) return 1024 * 1024; // 默认1MB
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return value * (units[unit] || 1);
};

// 请求追踪中间件
const requestTracker = (req, res, next) => {
  req.requestId = require('crypto').randomUUID();
  req.startTime = Date.now();
  
  // 记录请求开始
  console.log(`[${req.requestId}] ${req.method} ${req.url} - 开始处理`);
  
  // 监听响应结束
  const originalSend = res.send;
  res.send = function(...args) {
    const duration = Date.now() - req.startTime;
    console.log(`[${req.requestId}] ${req.method} ${req.url} - 处理完成 (${duration}ms)`);
    return originalSend.apply(this, args);
  };
  
  next();
};

// 健康检查中间件
const healthCheck = (req, res, next) => {
  if (req.url === '/health' || req.url === '/') {
    return res.json({
      success: true,
      message: '服务运行正常',
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  }
  next();
};

module.exports = {
  corsOptions,
  requestLogger,
  rateLimitMiddleware,
  errorHandler,
  notFoundHandler,
  bodySizeLimit,
  requestTracker,
  healthCheck,
  // 导出中间件配置函数
  setupMiddleware: (app) => {
    // 健康检查（最先执行）
    app.use(healthCheck);
    
    // 安全中间件
    app.use(helmet({
      contentSecurityPolicy: false // 为了支持API调用
    }));
    
    // CORS
    app.use(cors(corsOptions));
    
    // 压缩
    app.use(compression());
    
    // 请求追踪
    if (config.nodeEnv === 'development') {
      app.use(requestTracker);
    }
    
    // 请求日志
    app.use(requestLogger);
    
    // 请求体解析
    app.use(require('express').json({ limit: '10mb' }));
    app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));
    
    // 限流（只对API路由生效）
    app.use('/api', rateLimitMiddleware);
  }
};