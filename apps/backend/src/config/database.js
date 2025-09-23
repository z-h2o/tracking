import mysql from 'mysql2/promise';
import config from './index.js';

let pool = null;

// 创建数据库连接池
const createPool = () => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: true,
    connectionLimit: config.database.connectionLimit,
    queueLimit: 0,
    charset: config.database.charset,
    timezone: config.database.timezone,
    // 连接配置
    ssl: false,
    // 保持连接活跃
    keepAliveInitialDelay: 0,
    enableKeepAlive: true,
    // MySQL2 兼容的配置
    namedPlaceholders: true
  });

  // 监听连接事件
  pool.on('connection', (connection) => {
    console.log('New MySQL connection established as id ' + connection.threadId);
  });

  pool.on('error', (err) => {
    console.error('MySQL pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Database connection was closed. Recreating pool...');
      pool = null;
      createPool();
    }
  });

  return pool;
};

// 获取数据库连接
export const getConnection = async () => {
  if (!pool) {
    createPool();
  }
  return await pool.getConnection();
};

// 执行查询
export const query = async (sql, params = []) => {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    connection.release();
  }
};

// 执行事务
export const transaction = async (callback) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 关闭连接池
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// 测试数据库连接
export const testConnection = async () => {
  try {
    if (!pool) {
      createPool();
    }
    const connection = await getConnection();
    await connection.ping();
    connection.release();
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    // 不打印完整的错误堆栈，只记录错误信息
    return false;
  }
};

// 初始化数据库连接
export const initDatabase = () => {
  createPool();
  return testConnection();
};

export default pool;
