import dotenv from 'dotenv';

dotenv.config();

const config = {
  // 环境配置
  env: process.env.NODE_ENV || 'development',
  
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost'
  },

  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'tracking_system',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
    timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
    reconnect: true,
    charset: 'utf8mb4',
    timezone: '+08:00'
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs'
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
    dest: process.env.UPLOAD_DEST || './uploads'
  },

  // 监控配置
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT) || 9090
  },

  // 错误监控配置
  errorMonitoring: {
    enabled: process.env.ERROR_MONITORING_ENABLED === 'true',
    samplingRate: parseFloat(process.env.ERROR_SAMPLING_RATE) || 1.0,
    maxErrorsPerSession: parseInt(process.env.MAX_ERRORS_PER_SESSION) || 50
  },

  // 业务配置
  business: {
    // 数据保留天数
    dataRetentionDays: 90,
    // 批量处理大小
    batchSize: 1000,
    // 热点数据缓存时间（秒）
    hotDataCacheTime: 300
  }
};

// 验证必要的配置项
const validateConfig = () => {
  const required = [
    'database.host',
    'database.user',
    'database.database'
  ];

  for (const key of required) {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
    }
    if (!value) {
      throw new Error(`Required configuration missing: ${key}`);
    }
  }
};

// 在非测试环境下验证配置
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

export default config;
