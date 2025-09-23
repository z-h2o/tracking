/**
 * 响应工具类
 */
export class ResponseUtils {
  
  /**
   * 成功响应
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 分页响应
   */
  static paginated(res, data, pagination, message = 'Success') {
    const response = {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || data?.length || 0,
        totalPages: Math.ceil((pagination.total || data?.length || 0) / (pagination.limit || 20))
      },
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  }

  /**
   * 错误响应
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    const response = {
      success: false,
      error: {
        code,
        message
      },
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.error.details = details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 400, 'VALIDATION_ERROR', errors);
  }

  /**
   * 404响应
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * 403响应
   */
  static forbidden(res, message = 'Access denied') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * 401响应
   */
  static unauthorized(res, message = 'Authentication required') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * 429响应
   */
  static rateLimited(res, message = 'Too many requests', retryAfter = null) {
    const response = {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message
      },
      timestamp: new Date().toISOString()
    };

    if (retryAfter) {
      response.retryAfter = retryAfter;
      res.header('Retry-After', retryAfter);
    }

    return res.status(429).json(response);
  }

  /**
   * JSONP响应
   */
  static jsonp(res, data, callback, statusCode = 200) {
    const response = {
      success: statusCode < 400,
      data,
      timestamp: new Date().toISOString()
    };

    if (callback) {
      res.type('text/javascript');
      return res.status(statusCode).send(`${callback}(${JSON.stringify(response)})`);
    } else {
      return res.status(statusCode).json(response);
    }
  }

  /**
   * 创建响应装饰器
   */
  static createResponseDecorator(req, res, next) {
    // 为响应对象添加便捷方法
    res.success = (data, message, statusCode) => 
      ResponseUtils.success(res, data, message, statusCode);
    
    res.paginated = (data, pagination, message) => 
      ResponseUtils.paginated(res, data, pagination, message);
    
    res.error = (message, statusCode, code, details) => 
      ResponseUtils.error(res, message, statusCode, code, details);
    
    res.validationError = (errors, message) => 
      ResponseUtils.validationError(res, errors, message);
    
    res.notFound = (message) => 
      ResponseUtils.notFound(res, message);
    
    res.forbidden = (message) => 
      ResponseUtils.forbidden(res, message);
    
    res.unauthorized = (message) => 
      ResponseUtils.unauthorized(res, message);
    
    res.rateLimited = (message, retryAfter) => 
      ResponseUtils.rateLimited(res, message, retryAfter);

    next();
  }

  /**
   * 设置缓存头
   */
  static setCacheHeaders(res, maxAge = 300) {
    res.set({
      'Cache-Control': `public, max-age=${maxAge}`,
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
    return res;
  }

  /**
   * 设置CORS头
   */
  static setCORSHeaders(res, origin = '*') {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': true
    });
    return res;
  }

  /**
   * 响应时间头
   */
  static addResponseTime(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      res.set('X-Response-Time', `${responseTime}ms`);
    });
    
    next();
  }

  /**
   * 格式化数据大小
   */
  static formatDataSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成API响应元数据
   */
  static generateMetadata(req, data) {
    return {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      dataSize: data ? this.formatDataSize(JSON.stringify(data).length) : '0 B'
    };
  }
}

export default ResponseUtils;
