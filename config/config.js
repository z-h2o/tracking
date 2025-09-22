require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tracking_system',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key'
  },
  
  log: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:8080']
  },
  
  rateLimit: {
    points: parseInt(process.env.RATE_LIMIT_POINTS) || 100,
    duration: parseInt(process.env.RATE_LIMIT_DURATION) || 60
  }
};