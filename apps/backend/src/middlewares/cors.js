import cors from 'cors';
import config from '../config/index.js';

// CORS中间件配置
const corsOptions = {
  origin: (origin, callback) => {
    // 允许的域名列表
    const allowedOrigins = config.cors.origin === '*' ? true : config.cors.origin.split(',');
    
    // 开发环境允许所有来源
    if (config.env === 'development') {
      return callback(null, true);
    }
    
    // 生产环境检查域名白名单
    if (allowedOrigins === true || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Session-ID',
    'X-User-ID',
    'X-App-Version'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page'
  ],
  maxAge: 86400 // 24小时预检缓存
};

export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
