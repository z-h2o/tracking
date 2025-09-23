import { query, transaction } from '../config/database.js';

export class TrackingEvent {
  constructor(data = {}) {
    this.id = data.id;
    this.sessionId = data.session_id || data.sessionId;
    this.userId = data.user_id || data.userId;
    this.eventType = data.event_type || data.eventType || 'click';
    this.spm = data.spm;
    this.pageUrl = data.page_url || data.pageUrl;
    this.pageTitle = data.page_title || data.pageTitle;
    this.referrer = data.referrer;
    
    // 元素信息
    this.elementTag = data.element_tag || data.elementTag;
    this.elementId = data.element_id || data.elementId;
    this.elementClass = data.element_class || data.elementClass;
    this.elementText = data.element_text || data.elementText;
    this.elementAttributes = data.element_attributes || data.elementAttributes;
    
    // 位置信息
    this.elementX = data.element_x || data.elementX;
    this.elementY = data.element_y || data.elementY;
    this.elementWidth = data.element_width || data.elementWidth;
    this.elementHeight = data.element_height || data.elementHeight;
    
    // 事件信息
    this.eventData = data.event_data || data.eventData;
    this.triggerType = data.trigger_type || data.triggerType || 'click';
    
    // 浏览器信息
    this.userAgent = data.user_agent || data.userAgent;
    this.browserLanguage = data.browser_language || data.browserLanguage;
    this.timezone = data.timezone;
    this.viewportWidth = data.viewport_width || data.viewportWidth;
    this.viewportHeight = data.viewport_height || data.viewportHeight;
    
    // 设备信息
    this.deviceType = data.device_type || data.deviceType;
    this.osName = data.os_name || data.osName;
    this.browserName = data.browser_name || data.browserName;
    
    // 业务信息
    this.appVersion = data.app_version || data.appVersion;
    this.customData = data.custom_data || data.customData;
    
    // 时间戳
    this.eventTimestamp = data.event_timestamp || data.eventTimestamp;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  // 保存事件
  async save() {
    const sql = `
      INSERT INTO tracking_events (
        session_id, user_id, event_type, spm, page_url, page_title, referrer,
        element_tag, element_id, element_class, element_text, element_attributes,
        element_x, element_y, element_width, element_height,
        event_data, trigger_type,
        user_agent, browser_language, timezone, viewport_width, viewport_height,
        device_type, os_name, browser_name,
        app_version, custom_data, event_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 确保所有undefined值转换为null
    const toNull = (value) => value === undefined ? null : value;
    
    const params = [
      toNull(this.sessionId), toNull(this.userId), toNull(this.eventType), toNull(this.spm), 
      toNull(this.pageUrl), toNull(this.pageTitle), toNull(this.referrer),
      toNull(this.elementTag), toNull(this.elementId), toNull(this.elementClass), toNull(this.elementText), 
      this.elementAttributes ? JSON.stringify(this.elementAttributes) : null,
      toNull(this.elementX), toNull(this.elementY), toNull(this.elementWidth), toNull(this.elementHeight),
      this.eventData ? JSON.stringify(this.eventData) : null, toNull(this.triggerType),
      toNull(this.userAgent), toNull(this.browserLanguage), toNull(this.timezone), 
      toNull(this.viewportWidth), toNull(this.viewportHeight),
      toNull(this.deviceType), toNull(this.osName), toNull(this.browserName),
      toNull(this.appVersion), this.customData ? JSON.stringify(this.customData) : null, 
      toNull(this.eventTimestamp)
    ];

    const result = await query(sql, params);
    this.id = result.insertId;
    return this;
  }

  // 批量保存事件
  static async saveBatch(events) {
    if (!events || events.length === 0) {
      return [];
    }

    const sql = `
      INSERT INTO tracking_events (
        session_id, user_id, event_type, spm, page_url, page_title, referrer,
        element_tag, element_id, element_class, element_text, element_attributes,
        element_x, element_y, element_width, element_height,
        event_data, trigger_type,
        user_agent, browser_language, timezone, viewport_width, viewport_height,
        device_type, os_name, browser_name,
        app_version, custom_data, event_timestamp
      ) VALUES ?
    `;

    const values = events.map(event => {
      const e = new TrackingEvent(event);
      const toNull = (value) => value === undefined ? null : value;
      
      return [
        toNull(e.sessionId), toNull(e.userId), toNull(e.eventType), toNull(e.spm), 
        toNull(e.pageUrl), toNull(e.pageTitle), toNull(e.referrer),
        toNull(e.elementTag), toNull(e.elementId), toNull(e.elementClass), toNull(e.elementText),
        e.elementAttributes ? JSON.stringify(e.elementAttributes) : null,
        toNull(e.elementX), toNull(e.elementY), toNull(e.elementWidth), toNull(e.elementHeight),
        e.eventData ? JSON.stringify(e.eventData) : null, toNull(e.triggerType),
        toNull(e.userAgent), toNull(e.browserLanguage), toNull(e.timezone), 
        toNull(e.viewportWidth), toNull(e.viewportHeight),
        toNull(e.deviceType), toNull(e.osName), toNull(e.browserName),
        toNull(e.appVersion), e.customData ? JSON.stringify(e.customData) : null, 
        toNull(e.eventTimestamp)
      ];
    });

    return await transaction(async (connection) => {
      const [result] = await connection.query(sql, [values]);
      return result;
    });
  }

  // 根据ID查找
  static async findById(id) {
    const sql = 'SELECT * FROM tracking_events WHERE id = ?';
    const results = await query(sql, [id]);
    return results.length > 0 ? new TrackingEvent(results[0]) : null;
  }

  // 根据会话ID查找
  static async findBySessionId(sessionId, limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM tracking_events 
      WHERE session_id = ? 
      ORDER BY event_timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    const results = await query(sql, [sessionId, limit, offset]);
    return results.map(row => new TrackingEvent(row));
  }

  // 根据用户ID查找
  static async findByUserId(userId, limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM tracking_events 
      WHERE user_id = ? 
      ORDER BY event_timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    const results = await query(sql, [userId, limit, offset]);
    return results.map(row => new TrackingEvent(row));
  }

  // 按SPM统计
  static async getStatsBySPM(startDate, endDate) {
    const sql = `
      SELECT 
        spm,
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        event_type
      FROM tracking_events 
      WHERE created_at BETWEEN ? AND ?
        AND spm IS NOT NULL
      GROUP BY spm, event_type
      ORDER BY total_events DESC
    `;
    return await query(sql, [startDate, endDate]);
  }

  // 按页面统计
  static async getStatsByPage(startDate, endDate) {
    const sql = `
      SELECT 
        page_url,
        page_title,
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users
      FROM tracking_events 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY page_url, page_title
      ORDER BY total_events DESC
    `;
    return await query(sql, [startDate, endDate]);
  }

  // 实时统计
  static async getRealTimeStats(minutes = 5) {
    const sql = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as active_sessions,
        COUNT(DISTINCT user_id) as active_users
      FROM tracking_events 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
    const results = await query(sql, [minutes]);
    return results[0] || { total_events: 0, active_sessions: 0, active_users: 0 };
  }

  // 通用条件查询
  static async findByConditions(options = {}) {
    let sql = 'SELECT * FROM tracking_events WHERE 1=1';
    const params = [];

    // 添加过滤条件
    if (options.startDate && options.endDate) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(options.startDate, options.endDate);
    }

    if (options.eventType) {
      sql += ' AND event_type = ?';
      params.push(options.eventType);
    }

    if (options.spm) {
      sql += ' AND spm = ?';
      params.push(options.spm);
    }

    if (options.pageUrl) {
      sql += ' AND page_url LIKE ?';
      params.push(`%${options.pageUrl}%`);
    }

    if (options.deviceType) {
      sql += ' AND device_type = ?';
      params.push(options.deviceType);
    }

    if (options.sessionId) {
      sql += ' AND session_id = ?';
      params.push(options.sessionId);
    }

    if (options.userId) {
      sql += ' AND user_id = ?';
      params.push(options.userId);
    }

    // 排序（白名单验证，防止SQL注入）
    const allowedSortBy = ['created_at', 'event_timestamp', 'id', 'event_type', 'spm'];
    const allowedSortOrder = ['asc', 'desc'];
    
    const sortBy = allowedSortBy.includes(options.sortBy) ? options.sortBy : 'created_at';
    const sortOrder = allowedSortOrder.includes(options.sortOrder?.toLowerCase()) ? 
                      options.sortOrder.toUpperCase() : 'DESC';
    
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    // 分页
    if (options.limit && Number.isInteger(Number(options.limit))) {
      sql += ' LIMIT ?';
      params.push(Number(options.limit));
      
      if (options.offset && Number.isInteger(Number(options.offset))) {
        sql += ' OFFSET ?';
        params.push(Number(options.offset));
      }
    }

    const results = await query(sql, params);
    return results.map(row => new TrackingEvent(row));
  }

  // 获取事件趋势
  static async getEventTrend(days = 7) {
    const sql = `
      SELECT 
        DATE(created_at) as date,
        event_type,
        COUNT(*) as event_count
      FROM tracking_events 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), event_type
      ORDER BY date DESC, event_count DESC
    `;
    return await query(sql, [days]);
  }

  // 获取设备统计
  static async getDeviceStats(startDate, endDate) {
    const sql = `
      SELECT 
        device_type,
        os_name,
        browser_name,
        COUNT(*) as event_count,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users
      FROM tracking_events 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY device_type, os_name, browser_name
      ORDER BY event_count DESC
    `;
    return await query(sql, [startDate, endDate]);
  }

  // 获取热力图数据
  static async getHeatmapData(pageUrl, startDate, endDate) {
    const sql = `
      SELECT 
        element_x as x,
        element_y as y,
        element_width as width,
        element_height as height,
        COUNT(*) as click_count,
        spm,
        element_tag,
        element_text
      FROM tracking_events 
      WHERE page_url = ? 
        AND created_at BETWEEN ? AND ?
        AND event_type = 'click'
        AND element_x IS NOT NULL 
        AND element_y IS NOT NULL
      GROUP BY element_x, element_y, element_width, element_height, spm
      ORDER BY click_count DESC
    `;
    return await query(sql, [pageUrl, startDate, endDate]);
  }

  // 删除过期数据
  static async deleteExpired(days = 90) {
    const sql = `
      DELETE FROM tracking_events 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    return await query(sql, [days]);
  }
}

export default TrackingEvent;
