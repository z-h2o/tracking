import express from 'express';
import { trackingRateLimit } from '../middlewares/rateLimiter.js';
import { 
  validateTrackingEvent, 
  validateBatchTrackingEvents, 
  validateErrorLog,
  validateQueryParams,
  normalizeTrackingData 
} from '../validators/trackingValidator.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import TrackingEvent from '../models/TrackingEvent.js';
import ErrorLog from '../models/ErrorLog.js';

const router = express.Router();

// 应用追踪专用限流
router.use(trackingRateLimit);

// 接收埋点事件（支持单个对象和数组）
router.post('/events', asyncHandler(async (req, res) => {
  const isArray = Array.isArray(req.body);
  const events = isArray ? req.body : [req.body];
  
  // 验证数据
  if (isArray) {
    const { error } = await import('../validators/trackingValidator.js')
      .then(module => module.batchTrackingEventsSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: false
      }));
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      });
    }
  } else {
    const { error } = await import('../validators/trackingValidator.js')
      .then(module => module.trackingEventSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: false
      }));
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      });
    }
  }
  
  // 标准化数据
  const normalizedEvents = events.map(event => {
    const normalized = normalizeTrackingData(event);
    // 确保设置默认事件类型
    if (!normalized.eventType) {
      normalized.eventType = normalized.trigger || 'click';
    }
    return normalized;
  });

  if (normalizedEvents.length === 1) {
    const trackingEvent = new TrackingEvent(normalizedEvents[0]);
    await trackingEvent.save();
    
    res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      data: {
        id: trackingEvent.id,
        eventType: trackingEvent.eventType,
        timestamp: trackingEvent.eventTimestamp
      }
    });
  } else {
    const result = await TrackingEvent.saveBatch(normalizedEvents);
    
    res.status(201).json({
      success: true,
      message: 'Batch events tracked successfully',
      data: {
        insertedCount: result.affectedRows,
        firstInsertId: result.insertId
      }
    });
  }
}));

// 批量接收埋点事件
router.post('/events/batch', validateBatchTrackingEvents, asyncHandler(async (req, res) => {
  const events = req.body.map(event => normalizeTrackingData(event));
  
  const result = await TrackingEvent.saveBatch(events);

  res.status(201).json({
    success: true,
    message: 'Batch events tracked successfully',
    data: {
      insertedCount: result.affectedRows,
      firstInsertId: result.insertId
    }
  });
}));

// SPM埋点专用接口（兼容原有SDK）
router.post('/spm', validateTrackingEvent, asyncHandler(async (req, res) => {
  // 处理数组数据（兼容批量发送）
  const events = Array.isArray(req.body) ? req.body : [req.body];
  
  const normalizedEvents = events.map(event => {
    const normalized = normalizeTrackingData(event);
    // 确保设置默认事件类型
    if (!normalized.eventType) {
      normalized.eventType = normalized.trigger || 'click';
    }
    return normalized;
  });

  if (normalizedEvents.length === 1) {
    const trackingEvent = new TrackingEvent(normalizedEvents[0]);
    await trackingEvent.save();
    
    res.status(201).json({
      success: true,
      message: 'SPM event tracked successfully',
      data: {
        id: trackingEvent.id
      }
    });
  } else {
    const result = await TrackingEvent.saveBatch(normalizedEvents);
    
    res.status(201).json({
      success: true,
      message: 'SPM batch events tracked successfully',
      data: {
        insertedCount: result.affectedRows
      }
    });
  }
}));

// 接收错误日志
router.post('/errors', validateErrorLog, asyncHandler(async (req, res) => {
  const errorLog = new ErrorLog(req.body);
  await errorLog.save();

  res.status(201).json({
    success: true,
    message: 'Error logged successfully',
    data: {
      id: errorLog.id,
      errorType: errorLog.errorType,
      timestamp: errorLog.errorTimestamp
    }
  });
}));

// 查询埋点事件 & JSONP追踪接口 & 图片追踪接口
router.get('/events', asyncHandler(async (req, res) => {
  const { data: dataStr, callback, t } = req.query;
  
  // 检查是否为追踪请求（JSONP 或 图片方式）
  if (dataStr) {
    // 图片追踪请求的特征：有 data 参数，可能有时间戳参数 t，但没有 callback
    // JSONP追踪请求的特征：有 data 参数和 callback 参数
    const isImageTracking = !callback && (t || req.headers['sec-fetch-dest'] === 'image');
    const isJSONPTracking = !!callback;
    
    if (isImageTracking || isJSONPTracking) {
      try {
        const data = JSON.parse(decodeURIComponent(dataStr));
        const events = Array.isArray(data) ? data : [data];
        
        const normalizedEvents = events.map(event => {
          const normalized = normalizeTrackingData(event);
          // 确保设置默认事件类型
          if (!normalized.eventType) {
            normalized.eventType = normalized.trigger || 'click';
          }
          return normalized;
        });

        if (normalizedEvents.length === 1) {
          const trackingEvent = new TrackingEvent(normalizedEvents[0]);
          await trackingEvent.save();
          
          const response = {
            success: true,
            message: 'Event tracked successfully',
            data: { id: trackingEvent.id }
          };
          
          if (isJSONPTracking) {
            // JSONP 响应
            res.type('text/javascript').send(`${callback}(${JSON.stringify(response)})`);
          } else {
            // 图片追踪响应：返回1x1透明PNG图片
            const transparentPixel = Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'base64'
            );
            res.set({
              'Content-Type': 'image/png',
              'Content-Length': transparentPixel.length,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.send(transparentPixel);
          }
        } else {
          const result = await TrackingEvent.saveBatch(normalizedEvents);
          
          const response = {
            success: true,
            message: 'Batch events tracked successfully',
            data: { insertedCount: result.affectedRows }
          };
          
          if (isJSONPTracking) {
            // JSONP 响应
            res.type('text/javascript').send(`${callback}(${JSON.stringify(response)})`);
          } else {
            // 图片追踪响应：返回1x1透明PNG图片
            const transparentPixel = Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              'base64'
            );
            res.set({
              'Content-Type': 'image/png',
              'Content-Length': transparentPixel.length,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.send(transparentPixel);
          }
        }
      } catch (error) {
        const errorResponse = {
          success: false,
          error: 'Invalid data format',
          message: error.message
        };
        
        if (isJSONPTracking) {
          res.type('text/javascript').send(`${callback}(${JSON.stringify(errorResponse)})`);
        } else {
          // 图片追踪错误时也返回透明图片，避免前端显示破损图片
          const transparentPixel = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'base64'
          );
          res.set({
            'Content-Type': 'image/png',
            'Content-Length': transparentPixel.length,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.send(transparentPixel);
        }
      }
      return;
    }
  }
  
  // 查询逻辑（添加验证）
  const { error, value } = await import('../validators/trackingValidator.js')
    .then(module => module.queryParamsSchema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false
    }));

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.details
    });
  }

  const {
    startDate,
    endDate,
    sessionId,
    userId,
    eventType,
    spm,
    pageUrl,
    deviceType,
    page,
    limit,
    sortBy,
    sortOrder
  } = value;

  let events;
  
  if (sessionId) {
    events = await TrackingEvent.findBySessionId(sessionId, limit, (page - 1) * limit);
  } else if (userId) {
    events = await TrackingEvent.findByUserId(userId, limit, (page - 1) * limit);
  } else {
    // 构建查询选项
    const options = {
      startDate,
      endDate,
      eventType,
      spm,
      pageUrl,
      deviceType,
      limit,
      offset: (page - 1) * limit,
      sortBy,
      sortOrder
    };
    
    events = await TrackingEvent.findByConditions(options);
  }

  res.json({
    success: true,
    data: events,
    pagination: {
      page,
      limit,
      total: events.length
    }
  });
}));

// 根据ID查询单个事件
router.get('/events/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await TrackingEvent.findById(id);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  res.json({
    success: true,
    data: event
  });
}));

// 查询错误日志
router.get('/errors', validateQueryParams, asyncHandler(async (req, res) => {
  const options = { ...req.query };
  const errors = await ErrorLog.getErrorList(options);

  res.json({
    success: true,
    data: errors,
    pagination: {
      page: options.page,
      limit: options.limit,
      total: errors.length
    }
  });
}));

// JSONP支持（兼容原有SDK的JSONP请求）
router.get('/spm', asyncHandler(async (req, res) => {
  const { data: dataStr, callback } = req.query;
  
  if (!dataStr) {
    const error = { error: 'Missing data parameter' };
    return callback ? 
      res.type('text/javascript').send(`${callback}(${JSON.stringify(error)})`) :
      res.status(400).json(error);
  }

  try {
    const data = JSON.parse(decodeURIComponent(dataStr));
    const normalizedData = normalizeTrackingData(data);
    
    const trackingEvent = new TrackingEvent(normalizedData);
    await trackingEvent.save();

    const response = {
      success: true,
      message: 'Event tracked successfully',
      data: { id: trackingEvent.id }
    };

    if (callback) {
      res.type('text/javascript').send(`${callback}(${JSON.stringify(response)})`);
    } else {
      res.json(response);
    }
  } catch (error) {
    const errorResponse = {
      success: false,
      error: 'Invalid data format',
      message: error.message
    };

    if (callback) {
      res.type('text/javascript').send(`${callback}(${JSON.stringify(errorResponse)})`);
    } else {
      res.status(400).json(errorResponse);
    }
  }
}));

// 实时统计
router.get('/stats/realtime', asyncHandler(async (req, res) => {
  const { minutes = 5 } = req.query;
  
  const [trackingStats, errorStats] = await Promise.all([
    TrackingEvent.getRealTimeStats(minutes),
    ErrorLog.getRealTimeErrorStats(minutes)
  ]);

  res.json({
    success: true,
    data: {
      tracking: trackingStats,
      errors: errorStats,
      timeWindow: `${minutes} minutes`
    }
  });
}));

export default router;
