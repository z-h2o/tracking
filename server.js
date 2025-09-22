const express = require('express');
const config = require('./config/config');
const database = require('./config/database');
const { setupMiddleware, errorHandler, notFoundHandler } = require('./middleware');

// 导入路由
const trackingRoutes = require('./routes/tracking');
const analyticsRoutes = require('./routes/analytics');

// 创建Express应用
const app = express();

// 设置中间件
setupMiddleware(app);

// 路由配置
app.use('/api/tracking', trackingRoutes);
app.use('/api/analytics', analyticsRoutes);

// API根路由
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '埋点后台服务 API',
    version: '1.0.0',
    endpoints: {
      tracking: {
        event: 'POST /api/tracking/event',
        pageview: 'POST /api/tracking/pageview',
        error: 'POST /api/tracking/error',
        user: 'POST /api/tracking/user',
        batch: 'POST /api/tracking/batch',
        health: 'GET /api/tracking/health'
      },
      analytics: {
        events: 'GET /api/analytics/events',
        pageviews: 'GET /api/analytics/pageviews',
        userJourney: 'GET /api/analytics/user-journey/:userId',
        trends: 'GET /api/analytics/trends',
        realtime: 'GET /api/analytics/realtime',
        topPages: 'GET /api/analytics/top-pages',
        retention: 'GET /api/analytics/retention/:cohortDate',
        errors: 'GET /api/analytics/errors',
        overview: 'GET /api/analytics/overview'
      }
    },
    documentation: 'https://github.com/your-repo/tracking-backend/blob/main/README.md'
  });
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 优雅关闭处理
const gracefulShutdown = (signal) => {
  console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
  
  server.close(async (err) => {
    if (err) {
      console.error('服务器关闭时发生错误:', err);
      process.exit(1);
    }
    
    console.log('HTTP服务器已关闭');
    
    try {
      await database.close();
      console.log('数据库连接已关闭');
      console.log('应用程序已优雅关闭');
      process.exit(0);
    } catch (error) {
      console.error('关闭数据库连接时发生错误:', error);
      process.exit(1);
    }
  });
  
  // 强制关闭超时
  setTimeout(() => {
    console.error('强制关闭应用程序');
    process.exit(1);
  }, 10000);
};

// 启动服务器
const server = app.listen(config.port, () => {
  console.log(`\n🚀 埋点后台服务已启动`);
  console.log(`📍 服务地址: http://localhost:${config.port}`);
  console.log(`📊 API文档: http://localhost:${config.port}/api`);
  console.log(`🌍 环境: ${config.nodeEnv}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  
  // 测试数据库连接
  database.healthCheck()
    .then(result => {
      console.log(`💾 数据库状态: ${result.status === 'healthy' ? '✅ 正常' : '❌ 异常'}`);
      if (result.status !== 'healthy') {
        console.log(`   错误信息: ${result.message}`);
      }
    })
    .catch(error => {
      console.error('💾 数据库状态: ❌ 连接失败');
      console.error('   错误信息:', error.message);
    });
    
  console.log(`\n使用说明:`);
  console.log(`1. 确保MySQL数据库已安装并运行`);
  console.log(`2. 复制 .env.example 为 .env 并配置数据库连接`);
  console.log(`3. 运行 database/schema.sql 创建数据库表`);
  console.log(`4. 开始发送埋点数据到相应的API端点\n`);
});

// 监听进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;