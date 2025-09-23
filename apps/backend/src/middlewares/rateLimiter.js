import rateLimit from 'express-rate-limit';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import config from '../config/index.js';
import logger from './logger.js';

// 基于express-rate-limit的简单限流
export const basicRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // 返回rate limit信息在 `RateLimit-*` headers
  legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// 基于内存的高级限流器
const memoryRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    // 使用IP + User-Agent组合作为key
    return `${req.ip}_${req.get('User-Agent')}`;
  },
  points: config.rateLimit.maxRequests, // 允许的请求数
  duration: Math.floor(config.rateLimit.windowMs / 1000), // 时间窗口（秒）
  blockDuration: 60, // 阻塞时间（秒）
});

// 埋点数据专用限流器（更宽松）
export const trackingRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 1000, // 每分钟1000次请求
  message: {
    error: 'Tracking rate limit exceeded',
    message: 'Too many tracking requests, please slow down.',
    code: 'TRACKING_RATE_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => {
    // 使用sessionId或IP作为key
    return req.get('X-Session-ID') || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Tracking rate limit exceeded', {
      sessionId: req.get('X-Session-ID'),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    
    res.status(429).json({
      error: 'Tracking rate limit exceeded',
      message: 'Too many tracking requests, please slow down.',
      code: 'TRACKING_RATE_LIMIT_EXCEEDED'
    });
  }
});

// API查询专用限流器（较严格）
export const apiQueryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每15分钟100次请求
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many API requests, please try again later.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => {
    // 使用用户ID或IP作为key
    return req.get('X-User-ID') || req.ip;
  }
});

// 高级限流中间件
export const advancedRateLimit = async (req, res, next) => {
  try {
    await memoryRateLimiter.consume(req);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 60000;
    
    // 设置响应头
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': config.rateLimit.maxRequests,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });
    
    logger.warn('Advanced rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      remainingPoints,
      msBeforeNext
    });
    
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later.',
      code: 'ADVANCED_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

// 动态限流中间件工厂
export const createDynamicRateLimit = (options = {}) => {
  const {
    points = 100,
    duration = 900, // 15分钟
    blockDuration = 60,
    keyGenerator = (req) => req.ip
  } = options;

  const limiter = new RateLimiterMemory({
    keyGenerator,
    points,
    duration,
    blockDuration
  });

  return async (req, res, next) => {
    try {
      await limiter.consume(req);
      next();
    } catch (rejRes) {
      const remainingPoints = rejRes.remainingPoints || 0;
      const msBeforeNext = rejRes.msBeforeNext || blockDuration * 1000;
      
      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': points,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
      });
      
      logger.warn('Dynamic rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        remainingPoints,
        msBeforeNext,
        limiterConfig: { points, duration, blockDuration }
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later.',
        code: 'DYNAMIC_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(msBeforeNext / 1000)
      });
    }
  };
};

export default basicRateLimit;
