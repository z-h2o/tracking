import express from 'express';
import { apiQueryRateLimit } from '../middlewares/rateLimiter.js';
import { validateQueryParams } from '../validators/trackingValidator.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import TrackingEvent from '../models/TrackingEvent.js';
import ErrorLog from '../models/ErrorLog.js';

const router = express.Router();

// API查询限流
router.use(apiQueryRateLimit);

// 仪表板统计数据
router.get('/dashboard', validateQueryParams, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7天前

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  // 并行获取各种统计数据
  const [
    pageStats,
    spmStats,
    errorStats,
    realtimeStats
  ] = await Promise.all([
    TrackingEvent.getStatsByPage(start, end),
    TrackingEvent.getStatsBySPM(start, end),
    ErrorLog.getErrorStats(start, end),
    TrackingEvent.getRealTimeStats(5) // 最近5分钟
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        realtime: realtimeStats
      },
      pages: {
        title: 'Page Statistics',
        data: pageStats.slice(0, 20) // 取前20个页面
      },
      spm: {
        title: 'SPM Statistics',
        data: spmStats.slice(0, 20) // 取前20个SPM
      },
      errors: {
        title: 'Error Statistics',
        data: errorStats.slice(0, 10) // 取前10个错误类型
      }
    }
  });
}));

// 实时统计
router.get('/realtime', asyncHandler(async (req, res) => {
  const { minutes = 5 } = req.query;
  
  const [trackingStats, errorStats] = await Promise.all([
    TrackingEvent.getRealTimeStats(minutes),
    ErrorLog.getRealTimeErrorStats(minutes)
  ]);

  res.json({
    success: true,
    data: {
      timeWindow: `${minutes} minutes`,
      tracking: trackingStats,
      errors: errorStats,
      timestamp: new Date().toISOString()
    }
  });
}));

// 趋势分析
router.get('/trends', validateQueryParams, asyncHandler(async (req, res) => {
  const { days = 7, type = 'events' } = req.query;
  
  let trendData;
  
  if (type === 'errors') {
    trendData = await ErrorLog.getErrorTrend(days);
  } else {
    // 需要在TrackingEvent模型中实现getTrend方法
    trendData = await TrackingEvent.getEventTrend(days);
  }

  res.json({
    success: true,
    data: {
      type,
      timeRange: `${days} days`,
      trends: trendData
    }
  });
}));

// 页面分析
router.get('/pages', validateQueryParams, asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 50 } = req.query;
  
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  const pageStats = await TrackingEvent.getStatsByPage(start, end);
  
  res.json({
    success: true,
    data: {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      pages: pageStats.slice(0, limit),
      total: pageStats.length
    }
  });
}));

// SPM分析
router.get('/spm', validateQueryParams, asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 50 } = req.query;
  
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  const spmStats = await TrackingEvent.getStatsBySPM(start, end);
  
  res.json({
    success: true,
    data: {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      spm: spmStats.slice(0, limit),
      total: spmStats.length
    }
  });
}));

// 错误分析
router.get('/errors', validateQueryParams, asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 50 } = req.query;
  
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  const [errorStats, topErrors, errorTrend] = await Promise.all([
    ErrorLog.getErrorStats(start, end),
    ErrorLog.getTopErrors(10, 7),
    ErrorLog.getErrorTrend(7)
  ]);
  
  res.json({
    success: true,
    data: {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      statistics: errorStats,
      topErrors: topErrors,
      trend: errorTrend
    }
  });
}));

// 用户行为分析
router.get('/user-behavior', validateQueryParams, asyncHandler(async (req, res) => {
  const { userId, sessionId, startDate, endDate } = req.query;
  
  if (!userId && !sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Either userId or sessionId is required'
    });
  }

  const events = userId ? 
    await TrackingEvent.findByUserId(userId, 1000) :
    await TrackingEvent.findBySessionId(sessionId, 1000);
  
  // 分析用户行为路径
  const behaviorPath = events
    .sort((a, b) => a.eventTimestamp - b.eventTimestamp)
    .map(event => ({
      timestamp: event.eventTimestamp,
      eventType: event.eventType,
      pageUrl: event.pageUrl,
      spm: event.spm,
      elementTag: event.elementTag,
      elementText: event.elementText
    }));

  // 统计页面停留时间
  const pageStayTimes = {};
  let lastPageTime = null;
  let lastPageUrl = null;

  behaviorPath.forEach(event => {
    if (event.eventType === 'page_view' || !lastPageUrl || event.pageUrl !== lastPageUrl) {
      if (lastPageUrl && lastPageTime) {
        const stayTime = event.timestamp - lastPageTime;
        pageStayTimes[lastPageUrl] = (pageStayTimes[lastPageUrl] || 0) + stayTime;
      }
      lastPageUrl = event.pageUrl;
      lastPageTime = event.timestamp;
    }
  });

  res.json({
    success: true,
    data: {
      userId,
      sessionId,
      behaviorPath,
      pageStayTimes,
      totalEvents: events.length,
      uniquePages: Object.keys(pageStayTimes).length
    }
  });
}));

// 设备和浏览器统计
router.get('/devices', validateQueryParams, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  // 需要在TrackingEvent模型中实现getDeviceStats方法
  const deviceStats = await TrackingEvent.getDeviceStats(start, end);
  
  res.json({
    success: true,
    data: {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      devices: deviceStats
    }
  });
}));

// 热力图数据
router.get('/heatmap', validateQueryParams, asyncHandler(async (req, res) => {
  const { pageUrl, startDate, endDate } = req.query;
  
  if (!pageUrl) {
    return res.status(400).json({
      success: false,
      message: 'pageUrl parameter is required'
    });
  }

  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getTime() - 24 * 60 * 60 * 1000); // 1天前

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  // 需要在TrackingEvent模型中实现getHeatmapData方法
  const heatmapData = await TrackingEvent.getHeatmapData(pageUrl, start, end);
  
  res.json({
    success: true,
    data: {
      pageUrl,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      heatmap: heatmapData
    }
  });
}));

export default router;
