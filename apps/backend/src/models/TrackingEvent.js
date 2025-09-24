import { query, transaction } from '../config/database.js';

export class TrackingEvent {
  constructor(data = {}) {
    this.id = data.id;
    
    // 基础信息
    this.sessionId = data.session_id || data.sessionId;
    this.userId = data.user_id || data.userId;
    this.appVersion = data.app_version || data.appVersion;
    this.category = data.category || 'default';
    this.sender = data.sender || 'xhr'; // 数据上报方式：jsonp, image, xhr, fetch
    
    // 时间戳
    this.eventTimestamp = data.event_timestamp || data.eventTimestamp || data.timestamp;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    
    // 页面信息
    this.pageUrl = data.page_url || data.pageUrl || data.url;
    this.pageTitle = data.page_title || data.pageTitle || data.page?.title;
    this.pageReferrer = data.page_referrer || data.pageReferrer || data.page?.referrer;
    this.viewportWidth = data.viewport_width || data.viewportWidth || data.page?.viewport?.width;
    this.viewportHeight = data.viewport_height || data.viewportHeight || data.page?.viewport?.height;
    
    // 用户环境信息
    this.userAgent = data.user_agent || data.userAgent || data.user?.userAgent;
    this.userLanguage = data.user_language || data.userLanguage || data.user?.language;
    this.userTimezone = data.user_timezone || data.userTimezone || data.user?.timezone;
    
    // 事件信息
    this.triggerType = data.trigger_type || data.triggerType || data.trigger;
    this.spm = data.spm;
    this.eventData = data.event_data || data.eventData;
    
    // 元素信息
    this.elementTagName = data.element_tag_name || data.elementTagName || data.element?.tagName;
    this.elementClassName = data.element_class_name || data.elementClassName || data.element?.className;
    this.elementId = data.element_id || data.elementId || data.element?.id;
    this.elementText = data.element_text || data.elementText || data.element?.text;
    this.elementAttributes = data.element_attributes || data.elementAttributes || data.element?.attributes;
    
    // 位置信息
    this.positionX = data.position_x || data.positionX || data.position?.x;
    this.positionY = data.position_y || data.positionY || data.position?.y;
    this.positionWidth = data.position_width || data.positionWidth || data.position?.width;
    this.positionHeight = data.position_height || data.positionHeight || data.position?.height;
  }

  // 保存事件
  async save() {
    // 防止错误数据被保存到tracking_events表
    if (this.category === 'error') {
      throw new Error('Error events should be saved to error_logs table, not tracking_events table');
    }

    const sql = `
      INSERT INTO tracking_events (
        session_id, user_id, app_version, category, sender,
        event_timestamp,
        page_url, page_title, page_referrer, viewport_width, viewport_height,
        user_agent, user_language, user_timezone,
        trigger_type, spm, event_data,
        element_tag_name, element_class_name, element_id, element_text, element_attributes,
        position_x, position_y, position_width, position_height
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 确保所有undefined值转换为null
    const toNull = (value) => value === undefined ? null : value;
    
    const params = [
      // 基础信息
      toNull(this.sessionId), toNull(this.userId), toNull(this.appVersion), toNull(this.category), toNull(this.sender),
      // 时间戳
      toNull(this.eventTimestamp),
      // 页面信息
      toNull(this.pageUrl), toNull(this.pageTitle), toNull(this.pageReferrer), 
      toNull(this.viewportWidth), toNull(this.viewportHeight),
      // 用户环境信息
      toNull(this.userAgent), toNull(this.userLanguage), toNull(this.userTimezone),
      // 事件信息
      toNull(this.triggerType), toNull(this.spm), 
      this.eventData ? JSON.stringify(this.eventData) : null,
      // 元素信息
      toNull(this.elementTagName), toNull(this.elementClassName), toNull(this.elementId), 
      toNull(this.elementText), this.elementAttributes ? JSON.stringify(this.elementAttributes) : null,
      // 位置信息
      toNull(this.positionX), toNull(this.positionY), toNull(this.positionWidth), toNull(this.positionHeight)
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

    // 过滤掉错误事件，只保存普通埋点事件
    const trackingEvents = events.filter(event => {
      const category = event.category || 'default';
      return category !== 'error';
    });

    if (trackingEvents.length === 0) {
      return { affectedRows: 0, insertId: 0 };
    }

    const sql = `
      INSERT INTO tracking_events (
        session_id, user_id, app_version, category,
        event_timestamp,
        page_url, page_title, page_referrer, viewport_width, viewport_height,
        user_agent, user_language, user_timezone,
        trigger_type, spm, event_data,
        element_tag_name, element_class_name, element_id, element_text, element_attributes,
        position_x, position_y, position_width, position_height
      ) VALUES ?
    `;

    const values = trackingEvents.map(event => {
      const e = new TrackingEvent(event);
      const toNull = (value) => value === undefined ? null : value;
      
      return [
        // 基础信息
        toNull(e.sessionId), toNull(e.userId), toNull(e.appVersion), toNull(e.category),
        // 时间戳
        toNull(e.eventTimestamp),
        // 页面信息
        toNull(e.pageUrl), toNull(e.pageTitle), toNull(e.pageReferrer), 
        toNull(e.viewportWidth), toNull(e.viewportHeight),
        // 用户环境信息
        toNull(e.userAgent), toNull(e.userLanguage), toNull(e.userTimezone),
        // 事件信息
        toNull(e.triggerType), toNull(e.spm), 
        e.eventData ? JSON.stringify(e.eventData) : null,
        // 元素信息
        toNull(e.elementTagName), toNull(e.elementClassName), toNull(e.elementId), 
        toNull(e.elementText), e.elementAttributes ? JSON.stringify(e.elementAttributes) : null,
        // 位置信息
        toNull(e.positionX), toNull(e.positionY), toNull(e.positionWidth), toNull(e.positionHeight)
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
        trigger_type
      FROM tracking_events 
      WHERE created_at BETWEEN ? AND ?
        AND spm IS NOT NULL
        AND category = 'default'
      GROUP BY spm, trigger_type
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
        AND category = 'default'
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
        AND category = 'default'
    `;
    const results = await query(sql, [minutes]);
    return results[0] || { total_events: 0, active_sessions: 0, active_users: 0 };
  }

  // 通用条件查询
  static async findByConditions(options = {}) {
    let sql = 'SELECT * FROM tracking_events WHERE category = ?';
    const params = [options.category || 'default'];

    // 添加过滤条件
    if (options.startDate && options.endDate) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(options.startDate, options.endDate);
    }

    if (options.triggerType) {
      sql += ' AND trigger_type = ?';
      params.push(options.triggerType);
    }

    if (options.spm) {
      sql += ' AND spm = ?';
      params.push(options.spm);
    }

    if (options.pageUrl) {
      sql += ' AND page_url LIKE ?';
      params.push(`%${options.pageUrl}%`);
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
    const allowedSortBy = ['created_at', 'event_timestamp', 'id', 'trigger_type', 'spm'];
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
        trigger_type,
        COUNT(*) as event_count
      FROM tracking_events 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND category = 'default'
      GROUP BY DATE(created_at), trigger_type
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
