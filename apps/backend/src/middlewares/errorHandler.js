import config from '../config/index.js';
import logger from './logger.js';

// 自定义错误类
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 验证错误类
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// 认证错误类
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// 授权错误类
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// 资源未找到错误类
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

// 冲突错误类
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

// 数据库错误处理
const handleDatabaseError = (error) => {
  logger.error('Database error', { error: error.message, stack: error.stack });
  
  // MySQL特定错误处理
  if (error.code) {
    switch (error.code) {
      case 'ER_DUP_ENTRY':
        return new ConflictError('Duplicate entry found');
      case 'ER_NO_SUCH_TABLE':
        return new AppError('Database table not found', 500, 'DATABASE_ERROR');
      case 'ER_ACCESS_DENIED_ERROR':
        return new AppError('Database access denied', 500, 'DATABASE_ERROR');
      case 'ECONNREFUSED':
        return new AppError('Database connection refused', 500, 'DATABASE_CONNECTION_ERROR');
      case 'PROTOCOL_CONNECTION_LOST':
        return new AppError('Database connection lost', 500, 'DATABASE_CONNECTION_ERROR');
      default:
        return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    }
  }
  
  return new AppError('Database error occurred', 500, 'DATABASE_ERROR');
};

// 处理未知错误
const handleUnknownError = (error) => {
  logger.error('Unknown error', { 
    error: error.message, 
    stack: error.stack,
    name: error.name 
  });
  
  return new AppError(
    config.env === 'production' ? 'Internal server error' : error.message,
    500,
    'INTERNAL_ERROR'
  );
};

// 格式化错误响应
const formatErrorResponse = (error, req) => {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // 开发环境添加详细信息
  if (config.env === 'development') {
    response.error.stack = error.stack;
    response.error.details = error.details;
  }

  // 生产环境添加请求ID
  if (req.requestId) {
    response.requestId = req.requestId;
  }

  return response;
};

// 404错误处理中间件
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// 主要错误处理中间件
export const errorHandler = (error, req, res, next) => {
  let err = error;

  // 处理不同类型的错误
  if (!err.isOperational) {
    if (err.name === 'ValidationError') {
      err = new ValidationError(err.message, err.details);
    } else if (err.name === 'CastError') {
      err = new ValidationError('Invalid data format');
    } else if (err.code && err.code.startsWith('ER_')) {
      err = handleDatabaseError(err);
    } else {
      err = handleUnknownError(err);
    }
  }

  // 记录错误日志
  const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', {
    requestId: req.requestId,
    error: {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      sessionId: req.get('X-Session-ID'),
      userId: req.get('X-User-ID')
    }
  });

  // 发送错误响应
  const statusCode = err.statusCode || 500;
  const response = formatErrorResponse(err, req);

  res.status(statusCode).json(response);
};

// 异步错误包装器
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 处理未捕获的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // 优雅关闭
  process.exit(1);
});

export default errorHandler;
