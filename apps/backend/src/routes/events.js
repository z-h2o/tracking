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
import UserSession from '../models/UserSession.js';

const router = express.Router();

// 应用追踪专用限流
router.use(trackingRateLimit);

// 统一事件接收接口（根据category自动路由）
router.post('/collect', asyncHandler(async (req, res) => {
  const isArray = Array.isArray(req.body);
  const events = isArray ? req.body : [req.body];
  
  const results = [];
  const sessionUpdates = new Map(); // 用于批量更新会话信息
  
  for (const eventData of events) {
    const category = eventData.category || 'default';
    
    if (category === 'error') {
      // 处理错误埋点
      const normalizedData = normalizeErrorData(eventData);
      const errorLog = new ErrorLog(normalizedData);
      await errorLog.save();
      
      results.push({
        type: 'error',
        id: errorLog.id,
        category: errorLog.category
      });
      
      // 更新会话错误计数
      const sessionId = errorLog.sessionId;
      if (!sessionUpdates.has(sessionId)) {
        sessionUpdates.set(sessionId, {
          sessionId,
          lastEvent: normalizedData,
          errorsCount: 0,
          eventsCount: 0
        });
      }
      sessionUpdates.get(sessionId).errorsCount++;
      
    } else {
      // 处理普通埋点
      const normalizedData = normalizeTrackingData(eventData);
      const trackingEvent = new TrackingEvent(normalizedData);
      await trackingEvent.save();
      
      results.push({
        type: 'tracking',
        id: trackingEvent.id,
        category: trackingEvent.category,
        triggerType: trackingEvent.triggerType
      });
      
      // 更新会话统计
      const sessionId = trackingEvent.sessionId;
      if (!sessionUpdates.has(sessionId)) {
        sessionUpdates.set(sessionId, {
          sessionId,
          lastEvent: normalizedData,
          eventsCount: 0,
          errorsCount: 0,
          pageViewsCount: 0,
          uniquePages: new Set()
        });
      }
      
      const sessionUpdate = sessionUpdates.get(sessionId);
      sessionUpdate.eventsCount++;
      
      if (trackingEvent.triggerType === 'view') {
        sessionUpdate.pageViewsCount++;
      }
      
      if (trackingEvent.pageUrl) {
        sessionUpdate.uniquePages.add(trackingEvent.pageUrl);
      }
    }
  }
  
  // 批量更新会话信息
  for (const [sessionId, updateData] of sessionUpdates) {
    await updateUserSession(sessionId, updateData);
  }
  
  if (isArray) {
    res.status(201).json({
      success: true,
      message: 'Batch events processed successfully',
      data: {
        totalProcessed: results.length,
        trackingEvents: results.filter(r => r.type === 'tracking').length,
        errorEvents: results.filter(r => r.type === 'error').length,
        results
      }
    });
  } else {
    const result = results[0];
    res.status(201).json({
      success: true,
      message: `${result.type === 'error' ? 'Error' : 'Event'} tracked successfully`,
      data: result
    });
  }
}));

// 兼容原有的埋点接口
router.post('/events', asyncHandler(async (req, res) => {
  const isArray = Array.isArray(req.body);
  const events = isArray ? req.body : [req.body];
  
  // 确保category为default
  const normalizedEvents = events.map(event => {
    const normalized = normalizeTrackingData(event);
    normalized.category = 'default';
    return normalized;
  });

  if (normalizedEvents.length === 1) {
    const trackingEvent = new TrackingEvent(normalizedEvents[0]);
    await trackingEvent.save();
    
    // 更新会话信息
    await updateUserSession(trackingEvent.sessionId, {
      sessionId: trackingEvent.sessionId,
      lastEvent: normalizedEvents[0],
      eventsCount: 1,
      pageViewsCount: trackingEvent.triggerType === 'view' ? 1 : 0,
      uniquePages: new Set([trackingEvent.pageUrl])
    });
    
    res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      data: {
        id: trackingEvent.id,
        triggerType: trackingEvent.triggerType,
        timestamp: trackingEvent.eventTimestamp
      }
    });
  } else {
    const result = await TrackingEvent.saveBatch(normalizedEvents);
    
    // 批量更新会话信息
    const sessionUpdates = new Map();
    normalizedEvents.forEach(event => {
      const sessionId = event.sessionId;
      if (!sessionUpdates.has(sessionId)) {
        sessionUpdates.set(sessionId, {
          sessionId,
          lastEvent: event,
          eventsCount: 0,
          pageViewsCount: 0,
          uniquePages: new Set()
        });
      }
      
      const sessionUpdate = sessionUpdates.get(sessionId);
      sessionUpdate.eventsCount++;
      if (event.triggerType === 'view') {
        sessionUpdate.pageViewsCount++;
      }
      if (event.pageUrl) {
        sessionUpdate.uniquePages.add(event.pageUrl);
      }
    });
    
    for (const [sessionId, updateData] of sessionUpdates) {
      await updateUserSession(sessionId, updateData);
    }
    
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

// 接收错误日志
router.post('/errors', asyncHandler(async (req, res) => {
  const normalizedData = normalizeErrorData(req.body);
  const errorLog = new ErrorLog(normalizedData);
  await errorLog.save();
  
  // 更新会话错误计数
  await updateUserSession(errorLog.sessionId, {
    sessionId: errorLog.sessionId,
    lastEvent: normalizedData,
    errorsCount: 1
  });

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
    const isImageTracking = !callback && (t || req.headers['sec-fetch-dest'] === 'image');
    const isJSONPTracking = !!callback;
    
    if (isImageTracking || isJSONPTracking) {
      try {
        const data = JSON.parse(decodeURIComponent(dataStr));
        const events = Array.isArray(data) ? data : [data];
        
        const results = [];
        const sessionUpdates = new Map();
        
        for (const eventData of events) {
          const category = eventData.category || 'default';
          
          if (category === 'error') {
            const normalizedData = normalizeErrorData(eventData);
            const errorLog = new ErrorLog(normalizedData);
            await errorLog.save();
            results.push({ type: 'error', id: errorLog.id });
            
            // 更新会话
            const sessionId = errorLog.sessionId;
            if (!sessionUpdates.has(sessionId)) {
              sessionUpdates.set(sessionId, {
                sessionId,
                lastEvent: normalizedData,
                errorsCount: 0,
                eventsCount: 0
              });
            }
            sessionUpdates.get(sessionId).errorsCount++;
          } else {
            const normalizedData = normalizeTrackingData(eventData);
            const trackingEvent = new TrackingEvent(normalizedData);
            await trackingEvent.save();
            results.push({ type: 'tracking', id: trackingEvent.id });
            
            // 更新会话
            const sessionId = trackingEvent.sessionId;
            if (!sessionUpdates.has(sessionId)) {
              sessionUpdates.set(sessionId, {
                sessionId,
                lastEvent: normalizedData,
                eventsCount: 0,
                errorsCount: 0,
                pageViewsCount: 0,
                uniquePages: new Set()
              });
            }
            
            const sessionUpdate = sessionUpdates.get(sessionId);
            sessionUpdate.eventsCount++;
            if (trackingEvent.triggerType === 'view') {
              sessionUpdate.pageViewsCount++;
            }
            if (trackingEvent.pageUrl) {
              sessionUpdate.uniquePages.add(trackingEvent.pageUrl);
            }
          }
        }
        
        // 批量更新会话
        for (const [sessionId, updateData] of sessionUpdates) {
          await updateUserSession(sessionId, updateData);
        }

        if (isJSONPTracking) {
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
          res.type('text/javascript').status(200).end();
        } else {
          const transparentPixel = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'base64'
          );
          res.set({
            'Content-Type': 'image/png',
            'Content-Length': transparentPixel.length,
            'Access-Control-Allow-Origin': '*'
          });
          res.send(transparentPixel);
        }
      }
      return;
    }
  }
  
  // 查询逻辑
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
    triggerType,
    spm,
    pageUrl,
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
    const options = {
      category: 'default',
      startDate,
      endDate,
      triggerType,
      spm,
      pageUrl,
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

// 会话管理相关接口
router.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await UserSession.findBySessionId(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }

  res.json({
    success: true,
    data: session
  });
}));

router.get('/sessions/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0 } = req.query;
  
  const sessions = await UserSession.findByUserId(userId, limit, offset);
  
  res.json({
    success: true,
    data: sessions,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: sessions.length
    }
  });
}));

// 辅助函数：更新用户会话信息
async function updateUserSession(sessionId, updateData) {
  try {
    let session = await UserSession.findBySessionId(sessionId);
    const lastEvent = updateData.lastEvent;
    const timestamp = lastEvent.eventTimestamp || lastEvent.errorTimestamp || Date.now();
    
    if (!session) {
      // 创建新会话
      session = new UserSession({
        sessionId: sessionId,
        userId: lastEvent.userId,
        appVersion: lastEvent.appVersion,
        sessionStartTime: timestamp,
        lastActivityTime: timestamp,
        pageViewsCount: updateData.pageViewsCount || 0,
        eventsCount: updateData.eventsCount || 0,
        errorsCount: updateData.errorsCount || 0,
        uniquePagesCount: updateData.uniquePages ? updateData.uniquePages.size : 0,
        entryPageUrl: lastEvent.pageUrl,
        entryPageTitle: lastEvent.pageTitle,
        entryReferrer: lastEvent.pageReferrer,
        exitPageUrl: lastEvent.pageUrl,
        exitPageTitle: lastEvent.pageTitle,
        userAgent: lastEvent.userAgent,
        userLanguage: lastEvent.userLanguage,
        userTimezone: lastEvent.userTimezone,
        viewportWidth: lastEvent.viewportWidth,
        viewportHeight: lastEvent.viewportHeight,
        deviceType: inferDeviceType(lastEvent.userAgent),
        isActive: true,
        isBounce: (updateData.uniquePages ? updateData.uniquePages.size : 0) <= 1
      });
    } else {
      // 更新现有会话
      session.sessionEndTime = timestamp;
      session.lastActivityTime = timestamp;
      session.sessionDuration = Math.round((timestamp - session.sessionStartTime) / 1000);
      session.pageViewsCount += updateData.pageViewsCount || 0;
      session.eventsCount += updateData.eventsCount || 0;
      session.errorsCount += updateData.errorsCount || 0;
      
      if (updateData.uniquePages) {
        session.uniquePagesCount = updateData.uniquePages.size;
      }
      
      session.exitPageUrl = lastEvent.pageUrl;
      session.exitPageTitle = lastEvent.pageTitle;
      session.isBounce = session.uniquePagesCount <= 1;
    }
    
    await session.save();
  } catch (error) {
    console.error('Failed to update user session:', error);
  }
}

// 设备类型推断
function inferDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

export default router;
