const mysql = require('mysql2/promise');
const config = require('./config');

class Database {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    try {
      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        connectionLimit: config.database.connectionLimit,
        acquireTimeout: config.database.acquireTimeout,
        timeout: config.database.timeout,
        reconnect: config.database.reconnect,
        charset: 'utf8mb4'
      });
      
      console.log('数据库连接池已创建');
    } catch (error) {
      console.error('数据库连接池创建失败:', error);
      throw error;
    }
  }

  async getConnection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      console.error('获取数据库连接失败:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    const connection = await this.getConnection();
    try {
      const [results] = await connection.execute(sql, params);
      return results;
    } catch (error) {
      console.error('数据库查询失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async transaction(callback) {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      console.error('事务执行失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('数据库连接池已关闭');
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      await this.query('SELECT 1');
      return { status: 'healthy', message: '数据库连接正常' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

module.exports = new Database();