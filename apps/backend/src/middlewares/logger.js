import winston from 'winston';
import morgan from 'morgan';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';

// 确保日志目录存在
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Winston日志配置
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'tracking-backend' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 开发环境添加控制台输出
if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Morgan HTTP请求日志配置
const morganFormat = config.env === 'production' ? 'combined' : 'dev';

// 自定义Morgan格式，包含更多信息
const customMorganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

const morganMiddleware = morgan(customMorganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  },
  skip: (req, res) => {
    // 跳过健康检查和静态资源请求的日志
    return req.url === '/health' || req.url.startsWith('/static');
  }
});

// 请求日志中间件
export const requestLogger = (req, res, next) => {
  // 记录请求开始时间
  req.startTime = Date.now();
  
  // 生成请求ID
  req.requestId = Math.random().toString(36).substr(2, 9);
  
  // 记录请求信息
  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    sessionId: req.get('X-Session-ID'),
    userId: req.get('X-User-ID')
  });

  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });
  });

  next();
};

// 错误日志中间件
export const errorLogger = (error, req, res, next) => {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: {
      message: error.message,
      stack: error.stack,
      status: error.status || 500
    },
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    sessionId: req.get('X-Session-ID'),
    userId: req.get('X-User-ID')
  });

  next(error);
};

export { logger, morganMiddleware };
export default logger;
