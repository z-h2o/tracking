import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import config from './config/index.js';
import { initDatabase } from './config/database.js';
import logger, { morganMiddleware, requestLogger } from './middlewares/logger.js';
import corsMiddleware from './middlewares/cors.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { basicRateLimit } from './middlewares/rateLimiter.js';

// 导入路由
import trackingRoutes from './routes/tracking.js';
import eventsRoutes from './routes/events.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';

const app = express();

// 基础安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // 对于API服务器，通常不需要CSP
  crossOriginEmbedderPolicy: false
}));

// 启用gzip压缩
app.use(compression());

// CORS处理
app.use(corsMiddleware);

// 请求日志
app.use(morganMiddleware);
app.use(requestLogger);

// 基础限流
app.use(basicRateLimit);

// 解析JSON请求体
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // 验证JSON格式
    try {
      JSON.parse(buf);
    } catch (error) {
      const err = new Error('Invalid JSON format');
      err.statusCode = 400;
      err.code = 'INVALID_JSON';
      throw err;
    }
  }
}));

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查路由（在所有其他中间件之前）
app.use('/health', healthRoutes);

// API路由
app.use('/api/tracking', trackingRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'Tracking System Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API文档路由
app.get('/api', (req, res) => {
  res.json({
    name: 'Tracking System API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      events: {
        'POST /api/events/collect': 'Universal event collection (auto-routing by category)',
        'POST /api/events/events': 'Submit tracking events',
        'POST /api/events/errors': 'Submit error logs',
        'GET /api/events/events': 'Query tracking events (supports JSONP/image tracking)',
        'GET /api/events/sessions/:sessionId': 'Get session details',
        'GET /api/events/sessions/user/:userId': 'Get user sessions'
      },
      tracking: {
        'POST /api/tracking/events': 'Submit tracking events (legacy)',
        'POST /api/tracking/errors': 'Submit error logs (legacy)',
        'GET /api/tracking/events': 'Query tracking events (legacy)'
      },
      analytics: {
        'GET /api/analytics/dashboard': 'Get dashboard statistics',
        'GET /api/analytics/realtime': 'Get real-time statistics',
        'GET /api/analytics/trends': 'Get trending data'
      },
      health: {
        'GET /health': 'Health check',
        'GET /health/detailed': 'Detailed health status'
      }
    }
  });
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库连接
    logger.info('Initializing database connection...');
    const dbConnected = await initDatabase();
    if (!dbConnected) {
      logger.warn('Database connection failed, starting server without database');
      logger.warn('Please check your database configuration in .env file');
      logger.warn('The server will still start for API testing purposes');
    } else {
      logger.info('Database connection initialized successfully');
    }

    // 启动HTTP服务器
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server started on ${config.server.host}:${config.server.port}`, {
        environment: config.env,
        pid: process.pid,
        nodeVersion: process.version
      });
    });

    // 优雅关闭处理
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        
        // 关闭数据库连接
        import('./config/database.js').then(({ closePool }) => {
          closePool().then(() => {
            logger.info('Database connections closed');
            process.exit(0);
          });
        });
      });

      // 强制退出超时
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();
