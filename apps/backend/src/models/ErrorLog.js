import { query, transaction } from '../config/database.js';

export class ErrorLog {
  constructor(data = {}) {
    this.id = data.id;
    this.sessionId = data.session_id || data.sessionId;
    this.userId = data.user_id || data.userId;
    this.errorType = data.error_type || data.errorType;
    
    // 错误信息
    this.errorMessage = data.error_message || data.errorMessage;
    this.errorStack = data.error_stack || data.errorStack;
    this.errorFilename = data.error_filename || data.errorFilename;
    this.errorLineno = data.error_lineno || data.errorLineno;
    this.errorColno = data.error_colno || data.errorColno;
    
    // 页面信息
    this.pageUrl = data.page_url || data.pageUrl;
    this.pageTitle = data.page_title || data.pageTitle;
    this.referrer = data.referrer;
    
    // 浏览器信息
    this.userAgent = data.user_agent || data.userAgent;
    this.browserLanguage = data.browser_language || data.browserLanguage;
    this.timezone = data.timezone;
    
    // 设备信息
    this.deviceType = data.device_type || data.deviceType;
    this.osName = data.os_name || data.osName;
    this.browserName = data.browser_name || data.browserName;
    
    // 业务信息
    this.appVersion = data.app_version || data.appVersion;
    this.customData = data.custom_data || data.customData;
    
    // 错误级别和状态
    this.errorLevel = data.error_level || data.errorLevel || 'medium';
    this.resolved = data.resolved || false;
    
    // 时间戳
    this.errorTimestamp = data.error_timestamp || data.errorTimestamp;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  // 保存错误日志
  async save() {
    const sql = `
      INSERT INTO error_logs (
        session_id, user_id, error_type, error_message, error_stack, 
        error_filename, error_lineno, error_colno,
        page_url, page_title, referrer,
        user_agent, browser_language, timezone,
        device_type, os_name, browser_name,
        app_version, custom_data, error_level, error_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.sessionId, this.userId, this.errorType, this.errorMessage, this.errorStack,
      this.errorFilename, this.errorLineno, this.errorColno,
      this.pageUrl, this.pageTitle, this.referrer,
      this.userAgent, this.browserLanguage, this.timezone,
      this.deviceType, this.osName, this.browserName,
      this.appVersion, this.customData ? JSON.stringify(this.customData) : null, 
      this.errorLevel, this.errorTimestamp
    ];

    const result = await query(sql, params);
    this.id = result.insertId;
    return this;
  }

  // 批量保存错误日志
  static async saveBatch(errors) {
    if (!errors || errors.length === 0) {
      return [];
    }

    const sql = `
      INSERT INTO error_logs (
        session_id, user_id, error_type, error_message, error_stack, 
        error_filename, error_lineno, error_colno,
        page_url, page_title, referrer,
        user_agent, browser_language, timezone,
        device_type, os_name, browser_name,
        app_version, custom_data, error_level, error_timestamp
      ) VALUES ?
    `;

    const values = errors.map(error => {
      const e = new ErrorLog(error);
      return [
        e.sessionId, e.userId, e.errorType, e.errorMessage, e.errorStack,
        e.errorFilename, e.errorLineno, e.errorColno,
        e.pageUrl, e.pageTitle, e.referrer,
        e.userAgent, e.browserLanguage, e.timezone,
        e.deviceType, e.osName, e.browserName,
        e.appVersion, e.customData ? JSON.stringify(e.customData) : null,
        e.errorLevel, e.errorTimestamp
      ];
    });

    return await transaction(async (connection) => {
      const [result] = await connection.query(sql, [values]);
      return result;
    });
  }

  // 根据ID查找
  static async findById(id) {
    const sql = 'SELECT * FROM error_logs WHERE id = ?';
    const results = await query(sql, [id]);
    return results.length > 0 ? new ErrorLog(results[0]) : null;
  }

  // 获取错误统计
  static async getErrorStats(startDate, endDate) {
    const sql = `
      SELECT 
        error_type,
        COUNT(*) as total_errors,
        COUNT(DISTINCT session_id) as affected_sessions,
        COUNT(DISTINCT user_id) as affected_users,
        DATE(created_at) as date
      FROM error_logs 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY error_type, DATE(created_at)
      ORDER BY total_errors DESC
    `;
    return await query(sql, [startDate, endDate]);
  }

  // 获取错误趋势
  static async getErrorTrend(days = 7) {
    const sql = `
      SELECT 
        DATE(created_at) as date,
        error_type,
        COUNT(*) as error_count
      FROM error_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), error_type
      ORDER BY date DESC, error_count DESC
    `;
    return await query(sql, [days]);
  }

  // 获取热门错误
  static async getTopErrors(limit = 10, days = 7) {
    const sql = `
      SELECT 
        error_message,
        error_type,
        COUNT(*) as error_count,
        COUNT(DISTINCT session_id) as affected_sessions,
        MAX(created_at) as last_occurrence
      FROM error_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY error_message, error_type
      ORDER BY error_count DESC
      LIMIT ?
    `;
    return await query(sql, [days, limit]);
  }

  // 获取错误详情列表
  static async getErrorList(options = {}) {
    let sql = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];

    // 添加过滤条件
    if (options.errorType) {
      sql += ' AND error_type = ?';
      params.push(options.errorType);
    }

    if (options.errorLevel) {
      sql += ' AND error_level = ?';
      params.push(options.errorLevel);
    }

    if (options.resolved !== undefined) {
      sql += ' AND resolved = ?';
      params.push(options.resolved);
    }

    if (options.startDate && options.endDate) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(options.startDate, options.endDate);
    }

    if (options.sessionId) {
      sql += ' AND session_id = ?';
      params.push(options.sessionId);
    }

    if (options.userId) {
      sql += ' AND user_id = ?';
      params.push(options.userId);
    }

    // 排序和分页
    sql += ' ORDER BY created_at DESC';
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      
      if (options.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const results = await query(sql, params);
    return results.map(row => new ErrorLog(row));
  }

  // 标记错误为已解决
  static async markAsResolved(id) {
    const sql = 'UPDATE error_logs SET resolved = true, updated_at = NOW() WHERE id = ?';
    return await query(sql, [id]);
  }

  // 更新错误级别
  static async updateErrorLevel(id, level) {
    const sql = 'UPDATE error_logs SET error_level = ?, updated_at = NOW() WHERE id = ?';
    return await query(sql, [level, id]);
  }

  // 实时错误统计
  static async getRealTimeErrorStats(minutes = 5) {
    const sql = `
      SELECT 
        COUNT(*) as total_errors,
        COUNT(DISTINCT session_id) as affected_sessions,
        error_type,
        COUNT(*) as count
      FROM error_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      GROUP BY error_type
    `;
    return await query(sql, [minutes]);
  }

  // 删除过期错误日志
  static async deleteExpired(days = 90) {
    const sql = `
      DELETE FROM error_logs 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    return await query(sql, [days]);
  }
}

export default ErrorLog;
