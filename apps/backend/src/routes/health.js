import express from 'express';
import { testConnection } from '../config/database.js';
import config from '../config/index.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// 基础健康检查
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env
  });
}));

// 详细健康检查
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // 检查数据库连接
  const dbStatus = await testConnection();
  
  // 内存使用情况
  const memoryUsage = process.memoryUsage();
  
  // 系统信息
  const systemInfo = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    pid: process.pid,
    uptime: process.uptime()
  };

  const healthData = {
    status: dbStatus ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTime: `${Date.now() - startTime}ms`,
    environment: config.env,
    services: {
      database: {
        status: dbStatus ? 'connected' : 'disconnected',
        type: 'mysql'
      }
    },
    system: systemInfo,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    }
  };

  const statusCode = dbStatus ? 200 : 503;
  res.status(statusCode).json(healthData);
}));

// 数据库连接检查
router.get('/db', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const dbStatus = await testConnection();
  
  res.status(dbStatus ? 200 : 503).json({
    status: dbStatus ? 'connected' : 'disconnected',
    responseTime: `${Date.now() - startTime}ms`,
    timestamp: new Date().toISOString()
  });
}));

export default router;
