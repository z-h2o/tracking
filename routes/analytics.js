const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const moment = require('moment');

// 获取事件统计
router.get('/events', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      eventName: req.query.eventName,
      eventCategory: req.query.eventCategory,
      userId: req.query.userId
    };
    
    const data = await analyticsService.getEventStats(filters);
    
    res.json({
      success: true,
      message: '事件统计数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取事件统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取页面访问统计
router.get('/pageviews', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      pageUrl: req.query.pageUrl,
      userId: req.query.userId
    };
    
    const data = await analyticsService.getPageViewStats(filters);
    
    res.json({
      success: true,
      message: '页面访问统计数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取页面访问统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取用户行为路径
router.get('/user-journey/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.query;
    
    const data = await analyticsService.getUserJourney(userId, sessionId);
    
    res.json({
      success: true,
      message: '用户行为路径获取成功',
      data
    });
  } catch (error) {
    console.error('获取用户行为路径失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取趋势数据
router.get('/trends', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      granularity: req.query.granularity || 'day'
    };
    
    // 验证粒度参数
    if (!['hour', 'day', 'month'].includes(filters.granularity)) {
      return res.status(400).json({
        success: false,
        message: '粒度参数错误，支持：hour, day, month'
      });
    }
    
    const data = await analyticsService.getTrendData(filters);
    
    res.json({
      success: true,
      message: '趋势数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取实时数据
router.get('/realtime', async (req, res) => {
  try {
    const data = await analyticsService.getRealTimeData();
    
    res.json({
      success: true,
      message: '实时数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取实时数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取热门页面
router.get('/top-pages', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const limit = parseInt(req.query.limit) || 10;
    const data = await analyticsService.getTopPages(filters, limit);
    
    res.json({
      success: true,
      message: '热门页面数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取热门页面失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取用户留存数据
router.get('/retention/:cohortDate', async (req, res) => {
  try {
    const { cohortDate } = req.params;
    
    if (!moment(cohortDate).isValid()) {
      return res.status(400).json({
        success: false,
        message: '日期格式错误，请使用 YYYY-MM-DD 格式'
      });
    }
    
    const data = await analyticsService.getRetentionData(cohortDate);
    
    res.json({
      success: true,
      message: '用户留存数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取用户留存数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取错误统计
router.get('/errors', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      errorType: req.query.errorType
    };
    
    const data = await analyticsService.getErrorStats(filters);
    
    res.json({
      success: true,
      message: '错误统计数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取错误统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取数据概览
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 并行获取多个统计数据
    const [
      realTimeData,
      eventStats,
      pageViewStats,
      topPages,
      errorStats
    ] = await Promise.all([
      analyticsService.getRealTimeData(),
      analyticsService.getEventStats({ startDate, endDate }),
      analyticsService.getPageViewStats({ startDate, endDate }),
      analyticsService.getTopPages({ startDate, endDate }, 5),
      analyticsService.getErrorStats({ startDate, endDate })
    ]);
    
    // 计算总计数据
    const totalEvents = eventStats.reduce((sum, item) => sum + item.count, 0);
    const totalPageViews = pageViewStats.reduce((sum, item) => sum + item.page_views, 0);
    const totalErrors = errorStats.reduce((sum, item) => sum + item.error_count, 0);
    
    const overview = {
      realTime: realTimeData,
      summary: {
        totalEvents,
        totalPageViews,
        totalErrors,
        topEventCategories: eventStats.slice(0, 5),
        topPages: topPages.slice(0, 5),
        topErrors: errorStats.slice(0, 5)
      }
    };
    
    res.json({
      success: true,
      message: '数据概览获取成功',
      data: overview
    });
  } catch (error) {
    console.error('获取数据概览失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

module.exports = router;