const express = require('express');
const router = express.Router();
const trackingService = require('../services/trackingService');
const { 
  eventSchema, 
  pageViewSchema, 
  errorLogSchema, 
  userSchema 
} = require('../validators/trackingValidator');

// 获取客户端IP地址
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// 埋点事件收集API
router.post('/event', async (req, res) => {
  try {
    // 数据验证
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    // 补充请求信息
    const eventData = {
      ...value,
      ip_address: value.ip_address || getClientIP(req),
      user_agent: value.user_agent || req.headers['user-agent'],
      timestamp: value.timestamp || Date.now()
    };

    const result = await trackingService.recordEvent(eventData);
    
    res.json({
      success: true,
      message: '事件记录成功',
      data: result
    });
  } catch (error) {
    console.error('记录事件失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 页面访问记录API
router.post('/pageview', async (req, res) => {
  try {
    // 数据验证
    const { error, value } = pageViewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    // 补充请求信息
    const pageViewData = {
      ...value,
      ip_address: value.ip_address || getClientIP(req),
      user_agent: value.user_agent || req.headers['user-agent'],
      timestamp: value.timestamp || Date.now()
    };

    const result = await trackingService.recordPageView(pageViewData);
    
    res.json({
      success: true,
      message: '页面访问记录成功',
      data: result
    });
  } catch (error) {
    console.error('记录页面访问失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 错误日志收集API
router.post('/error', async (req, res) => {
  try {
    // 数据验证
    const { error, value } = errorLogSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    // 补充请求信息
    const errorData = {
      ...value,
      user_agent: value.user_agent || req.headers['user-agent'],
      timestamp: value.timestamp || Date.now()
    };

    const result = await trackingService.recordError(errorData);
    
    res.json({
      success: true,
      message: '错误日志记录成功',
      data: result
    });
  } catch (error) {
    console.error('记录错误日志失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 用户信息更新API
router.post('/user', async (req, res) => {
  try {
    // 数据验证
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        error: error.details[0].message
      });
    }

    // 补充请求信息
    const userData = {
      ...value,
      user_agent: value.user_agent || req.headers['user-agent']
    };

    const result = await trackingService.upsertUser(userData);
    
    res.json({
      success: true,
      message: '用户信息更新成功',
      data: result
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 批量数据处理API
router.post('/batch', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '批量数据格式错误，需要提供数组格式的data字段'
      });
    }

    if (data.length > 100) {
      return res.status(400).json({
        success: false,
        message: '批量处理数据量不能超过100条'
      });
    }

    const result = await trackingService.batchProcess(data);
    
    res.json({
      success: true,
      message: '批量处理完成',
      data: result
    });
  } catch (error) {
    console.error('批量处理失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 健康检查
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await require('../config/database').healthCheck();
    res.json({
      success: true,
      message: '服务运行正常',
      data: {
        server: 'healthy',
        database: dbHealth,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    });
  }
});

module.exports = router;