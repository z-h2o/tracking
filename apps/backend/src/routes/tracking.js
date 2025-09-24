import express from 'express';
import { trackingRateLimit } from '../middlewares/rateLimiter.js';
import { 
  validateTrackingEvent, 
  validateBatchTrackingEvents, 
  validateErrorLog,
  validateQueryParams,
  normalizeTrackingData,
  normalizeErrorData 
} from '../validators/trackingValidator.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import TrackingEvent from '../models/TrackingEvent.js';
import ErrorLog from '../models/ErrorLog.js';

const router = express.Router();

// 智能检测数据上报方式
function detectSender(req, eventData) {
  // 如果前端已经明确指定了sender，直接使用
  if (eventData.sender && ['jsonp', 'image', 'xhr', 'fetch'].includes(eventData.sender)) {
    return eventData.sender;
  }
  
  // 根据请求特征自动检测
  const { callback } = req.query;
  const contentType = req.headers['content-type'] || '';
  const secFetchDest = req.headers['sec-fetch-dest'] || '';
  
  if (callback) {
    return 'jsonp';
  } else if (secFetchDest === 'image' || req.query.t) {
    return 'image';
  } else if (req.method === 'POST' && contentType.includes('application/json')) {
    return 'fetch'; // 现代浏览器通常使用fetch发送JSON
  } else if (req.method === 'POST') {
    return 'xhr'; // 传统的XMLHttpRequest
  } else {
    return 'xhr'; // 默认值
  }
}

// 应用追踪专用限流
router.use(trackingRateLimit);

// 接收埋点事件（支持单个对象和数组，智能处理普通埋点和错误埋点）
router.post('/events', asyncHandler(async (req, res) => {
  const isArray = Array.isArray(req.body);
  const events = isArray ? req.body : [req.body];
  
  // 基础数据验证（允许所有字段通过）
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

  // 智能处理：根据事件类型分别处理
  const results = [];
  const trackingEvents = [];
  const errorEvents = [];

  for (const eventData of events) {
    const category = eventData.category || 'default';
    const sender = detectSender(req, eventData);
    
    if (category === 'error') {
      // 处理错误埋点
      const normalizedData = normalizeErrorData(eventData);
      normalizedData.sender = sender; // 设置检测到的sender
      const errorLog = new ErrorLog(normalizedData);
      await errorLog.save();
      
      results.push({ 
        type: 'error', 
        id: errorLog.id, 
        category: errorLog.category,
        errorType: errorLog.errorType
      });
      errorEvents.push(errorLog);
    } else {
      // 处理普通埋点
      const normalizedData = normalizeTrackingData(eventData);
      // 确保设置默认事件类型
      if (!normalizedData.triggerType) {
        normalizedData.triggerType = normalizedData.trigger || 'click';
      }
      // 确保category为default
      normalizedData.category = 'default';
      normalizedData.sender = sender; // 设置检测到的sender
      
      const trackingEvent = new TrackingEvent(normalizedData);
      await trackingEvent.save();
      
      results.push({ 
        type: 'tracking', 
        id: trackingEvent.id, 
        category: trackingEvent.category,
        triggerType: trackingEvent.triggerType
      });
      trackingEvents.push(trackingEvent);
    }
  }

  // 返回统一响应
  if (events.length === 1) {
    const result = results[0];
    res.status(201).json({
      success: true,
      message: `${result.type === 'error' ? 'Error' : 'Event'} tracked successfully`,
      data: result
    });
  } else {
    res.status(201).json({
      success: true,
      message: 'Batch events processed successfully',
      data: {
        totalProcessed: results.length,
        trackingEvents: trackingEvents.length,
        errorEvents: errorEvents.length,
        results
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
        
        // 智能处理：根据事件类型分别处理
        const results = [];
        const trackingEventsList = [];
        const errorEventsList = [];

        for (const eventData of events) {
          const category = eventData.category || 'default';
          const sender = detectSender(req, eventData);
          
          if (category === 'error') {
            // 处理错误埋点
            const normalizedData = normalizeErrorData(eventData);
            normalizedData.sender = sender; // 设置检测到的sender
            const errorLog = new ErrorLog(normalizedData);
            await errorLog.save();
            
            results.push({ 
              type: 'error', 
              id: errorLog.id, 
              category: errorLog.category,
              errorType: errorLog.errorType
            });
            errorEventsList.push(errorLog);
          } else {
            // 处理普通埋点
            const normalizedData = normalizeTrackingData(eventData);
            // 确保设置默认事件类型
            if (!normalizedData.triggerType) {
              normalizedData.triggerType = normalizedData.trigger || 'click';
            }
            // 确保category为default
            normalizedData.category = 'default';
            normalizedData.sender = sender; // 设置检测到的sender
            
            const trackingEvent = new TrackingEvent(normalizedData);
            await trackingEvent.save();
            
            results.push({ 
              type: 'tracking', 
              id: trackingEvent.id, 
              category: trackingEvent.category,
              triggerType: trackingEvent.triggerType
            });
            trackingEventsList.push(trackingEvent);
          }
        }

        // 统一响应处理（不管是单个还是批量，都返回成功响应）
        if (isJSONPTracking) {
          // JSONP 响应 - 不返回任何内容，避免回调函数错误
          res.type('text/javascript').status(200).end();
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
      } catch (error) {
        if (isJSONPTracking) {
          // JSONP 错误响应也不返回任何内容，避免回调函数错误
          res.type('text/javascript').status(200).end();
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
