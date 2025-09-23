const express = require('express');
const router = express.Router();
const spmTrackingService = require('../services/spmTrackingService');
const genericTrackingService = require('../services/genericTrackingService');
const { 
  spmDataSchema, 
  spmBatchSchema, 
  jsonpRequestSchema, 
  imageRequestSchema 
} = require('../validators/spmValidator');
const {
  genericEventSchema,
  genericEventBatchSchema,
  flexibleJsonpRequestSchema
} = require('../validators/genericValidator');

// 获取客户端IP地址
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// 检测数据类型（SPM数据 vs 通用事件数据）
const detectDataType = (data) => {
  if (Array.isArray(data)) {
    return data.length > 0 ? detectDataType(data[0]) : 'unknown';
  }
  
  // 检查是否为SPM数据格式
  if (data.spm && data.element && data.position && data.page) {
    return 'spm';
  }
  
  // 检查是否为通用事件数据格式
  if (data.event && typeof data.event === 'string') {
    return 'generic';
  }
  
  return 'unknown';
};

// 统一的数据处理函数（支持SPM和通用事件）
const processTrackingData = async (data, req, res, callbackName = null) => {
  try {
    const metadata = {
      clientIP: getClientIP(req),
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      timestamp: Date.now(),
      method: req.method
    };
    
    const dataType = detectDataType(data);
    let result;
    
    if (Array.isArray(data)) {
      // 批量处理
      if (dataType === 'spm') {
        const { error } = spmBatchSchema.validate(data);
        if (error) {
          const response = {
            success: false,
            message: '批量SPM数据验证失败',
            error: error.details[0].message
          };
          return sendResponse(res, response, callbackName, 400);
        }
        result = await spmTrackingService.processSPMBatch(data, metadata);
      } else if (dataType === 'generic') {
        const { error } = genericEventBatchSchema.validate(data);
        if (error) {
          const response = {
            success: false,
            message: '批量通用事件数据验证失败',
            error: error.details[0].message
          };
          return sendResponse(res, response, callbackName, 400);
        }
        result = await genericTrackingService.processGenericBatch(data, metadata);
      } else {
        const response = {
          success: false,
          message: '未知的数据类型',
          dataType
        };
        return sendResponse(res, response, callbackName, 400);
      }
      
      const response = {
        success: true,
        message: `批量${dataType === 'spm' ? 'SPM' : '通用事件'}数据处理完成`,
        data: result,
        dataType
      };
      return sendResponse(res, response, callbackName);
    } else {
      // 单条处理
      if (dataType === 'spm') {
        const { error, value } = spmDataSchema.validate(data);
        if (error) {
          const response = {
            success: false,
            message: 'SPM数据验证失败',
            error: error.details[0].message
          };
          return sendResponse(res, response, callbackName, 400);
        }
        result = await spmTrackingService.processSPMData(value, metadata);
      } else if (dataType === 'generic') {
        const { error, value } = genericEventSchema.validate(data);
        if (error) {
          const response = {
            success: false,
            message: '通用事件数据验证失败',
            error: error.details[0].message
          };
          return sendResponse(res, response, callbackName, 400);
        }
        result = await genericTrackingService.processGenericEvent(value, metadata);
      } else {
        const response = {
          success: false,
          message: '未知的数据类型',
          dataType,
          data
        };
        return sendResponse(res, response, callbackName, 400);
      }
      
      const response = {
        success: true,
        message: `${dataType === 'spm' ? 'SPM' : '通用事件'}数据处理成功`,
        data: result,
        dataType
      };
      return sendResponse(res, response, callbackName);
    }
  } catch (error) {
    console.error('处理埋点数据失败:', error);
    const response = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
    return sendResponse(res, response, callbackName, 500);
  }
};

// 统一的响应发送函数
const sendResponse = (res, response, callbackName = null, statusCode = 200) => {
  if (callbackName) {
    // JSONP响应
    res.status(statusCode).type('application/javascript');
    res.send(`${callbackName}(${JSON.stringify(response)});`);
  } else {
    // JSON响应
    res.status(statusCode).json(response);
  }
};

// POST接口 - 支持XHR和Fetch发送方式
router.post('/spm', async (req, res) => {
  await processTrackingData(req.body, req, res);
});

// POST批量接口
router.post('/spm/batch', async (req, res) => {
  const { data } = req.body;
  
  if (!Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      message: '批量数据格式错误，需要提供数组格式的data字段'
    });
  }
  
  await processTrackingData(data, req, res);
});

// GET接口 - 支持JSONP和图片发送方式（兼容多种callback参数名）
router.get('/spm', async (req, res) => {
  try {
    // 检查Accept头，如果是图片请求，直接处理为图片方式
    const acceptHeader = req.headers.accept || '';
    const isImageRequest = acceptHeader.includes('image/') || 
                          req.headers['sec-fetch-dest'] === 'image' ||
                          req.query.format === 'image';
    
    if (isImageRequest) {
      // 按图片方式处理
      if (!req.query.data) {
        console.error('图片请求缺少data参数');
        res.set('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
        return;
      }
      
      // 解析URL编码的JSON数据（可能是双重编码）
      let data;
      try {
        // 先尝试解码一次
        let decodedData = decodeURIComponent(req.query.data);
        
        // 如果解码后仍然是编码格式，再解码一次
        if (decodedData.includes('%')) {
          decodedData = decodeURIComponent(decodedData);
        }
        
        data = JSON.parse(decodedData);
        console.log('图片请求解析成功:', data);
      } catch (parseError) {
        console.error('图片请求数据解析失败:', parseError);
        console.error('原始数据:', req.query.data);
        // 返回1x1透明gif
        res.set('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
        return;
      }
      
      // 异步处理数据，不等待结果
      processTrackingData(data, req, {
        status: () => ({ json: () => {}, send: () => {} }),
        json: () => {},
        send: () => {}
      }).catch(error => {
        console.error('图片请求异步处理失败:', error);
      });
      
      // 立即返回1x1透明gif
      res.set('Content-Type', 'image/gif');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
      return;
    }
    
    // JSONP方式处理
    // 灵活支持多种callback参数名
    const callbackName = req.query.callback || req.query.jsonp || req.query.cb;
    
    if (!req.query.data) {
      const response = {
        success: false,
        message: '缺少data参数'
      };
      return sendResponse(res, response, callbackName, 400);
    }
    
    // 解析JSON数据
    let data;
    try {
      data = JSON.parse(req.query.data);
    } catch (parseError) {
      const response = {
        success: false,
        message: 'JSON数据解析失败',
        error: parseError.message
      };
      return sendResponse(res, response, callbackName, 400);
    }
    
    await processTrackingData(data, req, res, callbackName);
  } catch (error) {
    console.error('处理GET请求失败:', error);
    const response = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
    return sendResponse(res, response, req.query.callback, 500);
  }
});

// GET接口 - 支持图片发送方式
router.get('/spm/image', async (req, res) => {
  try {
    // 检查是否有data参数
    if (!req.query.data) {
      console.error('图片请求缺少data参数');
      res.set('Content-Type', 'image/gif');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
      return;
    }
    
    // 解析URL编码的JSON数据（可能是双重编码）
    let data;
    try {
      // 先尝试解码一次
      let decodedData = decodeURIComponent(req.query.data);
      
      // 如果解码后仍然是编码格式，再解码一次
      if (decodedData.includes('%')) {
        decodedData = decodeURIComponent(decodedData);
      }
      
      data = JSON.parse(decodedData);
      console.log('图片请求解析成功:', data);
    } catch (parseError) {
      console.error('图片请求数据解析失败:', parseError);
      console.error('原始数据:', req.query.data);
      // 返回1x1透明gif
      res.set('Content-Type', 'image/gif');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
      return;
    }
    
    // 异步处理数据，不等待结果
    processTrackingData(data, req, {
      status: () => ({ json: () => {}, send: () => {} }),
      json: () => {},
      send: () => {}
    }).catch(error => {
      console.error('图片请求异步处理失败:', error);
    });
    
    // 立即返回1x1透明gif
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('处理图片请求失败:', error);
    // 返回1x1透明gif
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
});

// SPM统计接口
router.get('/spm/stats', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      spmId: req.query.spmId,
      triggerType: req.query.triggerType,
      url: req.query.url
    };
    
    const data = await spmTrackingService.getSPMStats(filters);
    
    res.json({
      success: true,
      message: 'SPM统计数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取SPM统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 热门SPM元素接口
router.get('/spm/top-elements', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const days = parseInt(req.query.days) || 7;
    
    const data = await spmTrackingService.getTopSPMElements(limit, days);
    
    res.json({
      success: true,
      message: '热门SPM元素数据获取成功',
      data
    });
  } catch (error) {
    console.error('获取热门SPM元素失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// SPM健康检查
router.get('/spm/health', async (req, res) => {
  try {
    const dbHealth = await require('../config/database').healthCheck();
    res.json({
      success: true,
      message: 'SPM埋点服务运行正常',
      data: {
        server: 'healthy',
        database: dbHealth,
        timestamp: Date.now(),
        supportedMethods: ['POST', 'GET-JSONP', 'GET-Image']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SPM埋点服务健康检查失败',
      error: error.message
    });
  }
});

module.exports = router;