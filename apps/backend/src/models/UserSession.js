import { query, transaction } from '../config/database.js';

export class UserSession {
  constructor(data = {}) {
    this.id = data.id;
    
    // 会话标识
    this.sessionId = data.session_id || data.sessionId;
    this.userId = data.user_id || data.userId;
    this.appVersion = data.app_version || data.appVersion;
    
    // 会话时间信息
    this.sessionStartTime = data.session_start_time || data.sessionStartTime;
    this.sessionEndTime = data.session_end_time || data.sessionEndTime;
    this.lastActivityTime = data.last_activity_time || data.lastActivityTime;
    this.sessionDuration = data.session_duration || data.sessionDuration;
    
    // 会话统计
    this.pageViewsCount = data.page_views_count || data.pageViewsCount || 0;
    this.eventsCount = data.events_count || data.eventsCount || 0;
    this.errorsCount = data.errors_count || data.errorsCount || 0;
    this.uniquePagesCount = data.unique_pages_count || data.uniquePagesCount || 0;
    
    // 第一个页面信息
    this.entryPageUrl = data.entry_page_url || data.entryPageUrl;
    this.entryPageTitle = data.entry_page_title || data.entryPageTitle;
    this.entryReferrer = data.entry_referrer || data.entryReferrer;
    
    // 最后一个页面信息
    this.exitPageUrl = data.exit_page_url || data.exitPageUrl;
    this.exitPageTitle = data.exit_page_title || data.exitPageTitle;
    
    // 用户环境信息
    this.userAgent = data.user_agent || data.userAgent;
    this.userLanguage = data.user_language || data.userLanguage;
    this.userTimezone = data.user_timezone || data.userTimezone;
    this.viewportWidth = data.viewport_width || data.viewportWidth;
    this.viewportHeight = data.viewport_height || data.viewportHeight;
    
    // 设备信息
    this.deviceType = data.device_type || data.deviceType || 'unknown';
    this.osName = data.os_name || data.osName;
    this.osVersion = data.os_version || data.osVersion;
    this.browserName = data.browser_name || data.browserName;
    this.browserVersion = data.browser_version || data.browserVersion;
    
    // IP和地理位置信息
    this.ipAddress = data.ip_address || data.ipAddress;
    this.country = data.country;
    this.region = data.region;
    this.city = data.city;
    
    // 会话状态
    this.isActive = data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : true;
    this.isBounce = data.is_bounce !== undefined ? data.is_bounce : data.isBounce !== undefined ? data.isBounce : false;
    
    // 时间戳
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  // 创建新会话
  async save() {
    const sql = `
      INSERT INTO user_sessions (
        session_id, user_id, app_version,
        session_start_time, last_activity_time,
        page_views_count, events_count, errors_count, unique_pages_count,
        entry_page_url, entry_page_title, entry_referrer,
        exit_page_url, exit_page_title,
        user_agent, user_language, user_timezone, viewport_width, viewport_height,
        device_type, os_name, os_version, browser_name, browser_version,
        ip_address, country, region, city,
        is_active, is_bounce
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        session_end_time = ?,
        last_activity_time = VALUES(last_activity_time),
        session_duration = CASE 
          WHEN VALUES(last_activity_time) > session_start_time 
          THEN ROUND((VALUES(last_activity_time) - session_start_time) / 1000)
          ELSE session_duration 
        END,
        page_views_count = VALUES(page_views_count),
        events_count = VALUES(events_count),
        errors_count = VALUES(errors_count),
        unique_pages_count = VALUES(unique_pages_count),
        exit_page_url = VALUES(exit_page_url),
        exit_page_title = VALUES(exit_page_title),
        is_bounce = VALUES(is_bounce),
        updated_at = CURRENT_TIMESTAMP
    `;

    const toNull = (value) => value === undefined ? null : value;

    const params = [
      // INSERT values
      toNull(this.sessionId), toNull(this.userId), toNull(this.appVersion),
      toNull(this.sessionStartTime), toNull(this.lastActivityTime),
      this.pageViewsCount, this.eventsCount, this.errorsCount, this.uniquePagesCount,
      toNull(this.entryPageUrl), toNull(this.entryPageTitle), toNull(this.entryReferrer),
      toNull(this.exitPageUrl), toNull(this.exitPageTitle),
      toNull(this.userAgent), toNull(this.userLanguage), toNull(this.userTimezone), 
      toNull(this.viewportWidth), toNull(this.viewportHeight),
      toNull(this.deviceType), toNull(this.osName), toNull(this.osVersion), 
      toNull(this.browserName), toNull(this.browserVersion),
      toNull(this.ipAddress), toNull(this.country), toNull(this.region), toNull(this.city),
      this.isActive, this.isBounce,
      // ON DUPLICATE KEY UPDATE values
      toNull(this.sessionEndTime)
    ];

    const result = await query(sql, params);
    if (!this.id) {
      this.id = result.insertId;
    }
    return this;
  }

  // 根据session_id查找
  static async findBySessionId(sessionId) {
    const sql = 'SELECT * FROM user_sessions WHERE session_id = ?';
    const results = await query(sql, [sessionId]);
    return results.length > 0 ? new UserSession(results[0]) : null;
  }

  // 根据用户ID查找会话列表
  static async findByUserId(userId, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM user_sessions 
      WHERE user_id = ? 
      ORDER BY session_start_time DESC 
      LIMIT ? OFFSET ?
    `;
    const results = await query(sql, [userId, limit, offset]);
    return results.map(row => new UserSession(row));
  }

  // 获取活跃会话
  static async getActiveSessions(minutes = 30) {
    const sql = `
      SELECT * FROM user_sessions 
      WHERE is_active = TRUE 
        AND last_activity_time >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL ? MINUTE)) * 1000
      ORDER BY last_activity_time DESC
    `;
    const results = await query(sql, [minutes]);
    return results.map(row => new UserSession(row));
  }

  // 更新会话活跃状态
  static async updateActiveStatus() {
    const sql = `
      UPDATE user_sessions 
      SET is_active = FALSE, 
          session_end_time = last_activity_time,
          session_duration = ROUND((last_activity_time - session_start_time) / 1000),
          updated_at = CURRENT_TIMESTAMP
      WHERE is_active = TRUE 
        AND last_activity_time < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE)) * 1000
    `;
    return await query(sql);
  }

  // 获取会话统计
  static async getSessionStats(startDate, endDate) {
    const sql = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(session_duration) as avg_session_duration,
        AVG(page_views_count) as avg_page_views,
        AVG(events_count) as avg_events,
        SUM(errors_count) as total_errors,
        COUNT(CASE WHEN is_bounce = TRUE THEN 1 END) as bounce_sessions,
        ROUND(COUNT(CASE WHEN is_bounce = TRUE THEN 1 END) / COUNT(*) * 100, 2) as bounce_rate
      FROM user_sessions 
      WHERE created_at BETWEEN ? AND ?
    `;
    const results = await query(sql, [startDate, endDate]);
    return results[0] || {};
  }

  // 获取设备类型分布
  static async getDeviceDistribution(startDate, endDate) {
    const sql = `
      SELECT 
        device_type,
        COUNT(*) as session_count,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(session_duration) as avg_duration,
        ROUND(COUNT(*) / (SELECT COUNT(*) FROM user_sessions WHERE created_at BETWEEN ? AND ?) * 100, 2) as percentage
      FROM user_sessions 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY device_type
      ORDER BY session_count DESC
    `;
    return await query(sql, [startDate, endDate, startDate, endDate]);
  }

  // 获取地理位置分布
  static async getGeographicDistribution(startDate, endDate) {
    const sql = `
      SELECT 
        country,
        region,
        city,
        COUNT(*) as session_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_sessions 
      WHERE created_at BETWEEN ? AND ?
        AND country IS NOT NULL
      GROUP BY country, region, city
      ORDER BY session_count DESC
      LIMIT 50
    `;
    return await query(sql, [startDate, endDate]);
  }

  // 删除过期会话数据
  static async deleteExpired(days = 90) {
    const sql = `
      DELETE FROM user_sessions 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    return await query(sql, [days]);
  }
}

export default UserSession;
