const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SPMTrackingService {
  // 处理SPM埋点数据
  async processSPMData(spmData, metadata = {}) {
    const sessionId = this.generateSessionId(spmData.user.userAgent, spmData.url);
    const userId = metadata.userId || this.generateUserId(spmData.user.userAgent, metadata.clientIP);
    
    return await database.transaction(async (connection) => {
      // 1. 记录SPM事件
      const eventResult = await this.recordSPMEvent(connection, spmData, userId, sessionId, metadata);
      
      // 2. 记录页面访问（如果是新页面）
      await this.recordPageAccess(connection, spmData, userId, sessionId, metadata);
      
      // 3. 记录元素交互
      await this.recordElementInteraction(connection, spmData, userId, sessionId, metadata);
      
      // 4. 更新或创建用户信息
      await this.upsertUserInfo(connection, userId, spmData.user, metadata);
      
      return {
        eventId: eventResult.eventId,
        userId,
        sessionId,
        spm: spmData.spm
      };
    });
  }
  
  // 批量处理SPM数据
  async processSPMBatch(spmDataArray, metadata = {}) {
    const results = [];
    const errors = [];
    
    for (const spmData of spmDataArray) {
      try {
        const result = await this.processSPMData(spmData, metadata);
        results.push(result);
      } catch (error) {
        console.error('处理SPM数据失败:', error);
        errors.push({
          spm: spmData.spm,
          error: error.message
        });
      }
    }
    
    return {
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
  
  // 记录SPM事件
  async recordSPMEvent(connection, spmData, userId, sessionId, metadata) {
    const eventId = uuidv4();
    
    const [result] = await connection.execute(
      `INSERT INTO events 
       (event_id, user_id, session_id, event_name, event_category, 
        page_url, page_title, referrer, ip_address, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        userId,
        sessionId,
        `spm_${spmData.trigger}`, // event_name: spm_click, spm_view
        'spm_tracking', // event_category
        spmData.url,
        spmData.page.title || null,
        spmData.page.referrer || null,
        metadata.clientIP || null,
        spmData.user.userAgent || null,
        spmData.timestamp
      ]
    );
    
    // 记录SPM特有的属性
    const spmProperties = {
      spm_id: spmData.spm,
      trigger_type: spmData.trigger,
      element_tag: spmData.element.tagName,
      element_class: spmData.element.className,
      element_id: spmData.element.id,
      element_text: spmData.element.text,
      position_x: spmData.position.x,
      position_y: spmData.position.y,
      element_width: spmData.position.width,
      element_height: spmData.position.height,
      viewport_width: spmData.page.viewport?.width,
      viewport_height: spmData.page.viewport?.height,
      user_language: spmData.user.language,
      user_timezone: spmData.user.timezone,
      ...spmData.element.attributes, // 自定义属性
      ...spmData.custom // 自定义数据
    };
    
    // 如果有事件信息（点击事件）
    if (spmData.event) {
      spmProperties.event_type = spmData.event.type;
      spmProperties.click_x = spmData.event.clientX;
      spmProperties.click_y = spmData.event.clientY;
      spmProperties.mouse_button = spmData.event.button;
    }
    
    // 插入属性
    const propertyPromises = Object.entries(spmProperties).map(([key, value]) => {
      if (value !== null && value !== undefined) {
        const propertyType = typeof value;
        const propertyValue = propertyType === 'object' ? JSON.stringify(value) : String(value);
        
        return connection.execute(
          `INSERT INTO event_properties (event_id, property_key, property_value, property_type) 
           VALUES (?, ?, ?, ?)`,
          [eventId, key, propertyValue, propertyType]
        );
      }
    }).filter(Boolean);
    
    await Promise.all(propertyPromises);
    
    return { eventId, insertId: result.insertId };
  }
  
  // 记录页面访问
  async recordPageAccess(connection, spmData, userId, sessionId, metadata) {
    // 检查是否已记录过此页面访问
    const [existing] = await connection.execute(
      `SELECT id FROM page_views 
       WHERE user_id = ? AND session_id = ? AND page_url = ? 
       AND timestamp > ? 
       LIMIT 1`,
      [userId, sessionId, spmData.url, spmData.timestamp - 30000] // 30秒内不重复记录
    );
    
    if (existing.length > 0) {
      return null; // 已存在，不重复记录
    }
    
    const [result] = await connection.execute(
      `INSERT INTO page_views 
       (user_id, session_id, page_url, page_title, referrer, 
        duration, scroll_depth, ip_address, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        sessionId,
        spmData.url,
        spmData.page.title || null,
        spmData.page.referrer || null,
        0, // duration 初始为0
        0, // scroll_depth 初始为0
        metadata.clientIP || null,
        spmData.user.userAgent || null,
        spmData.timestamp
      ]
    );
    
    return { insertId: result.insertId };
  }
  
  // 记录元素交互
  async recordElementInteraction(connection, spmData, userId, sessionId, metadata) {
    const [result] = await connection.execute(
      `INSERT INTO element_interactions 
       (user_id, session_id, page_url, spm_id, element_tag, element_class, 
        element_id, element_text, trigger_type, position_x, position_y, 
        element_width, element_height, timestamp, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        sessionId,
        spmData.url,
        spmData.spm,
        spmData.element.tagName,
        spmData.element.className || null,
        spmData.element.id || null,
        spmData.element.text || null,
        spmData.trigger,
        spmData.position.x,
        spmData.position.y,
        spmData.position.width,
        spmData.position.height,
        spmData.timestamp,
        metadata.clientIP || null
      ]
    );
    
    return { insertId: result.insertId };
  }
  
  // 更新用户信息
  async upsertUserInfo(connection, userId, userInfo, metadata) {
    const [result] = await connection.execute(
      `INSERT INTO users (user_id, device_id, user_agent, platform) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       user_agent = VALUES(user_agent), 
       platform = VALUES(platform), 
       updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        this.generateDeviceId(userInfo.userAgent, metadata.clientIP),
        userInfo.userAgent || null,
        this.detectPlatform(userInfo.userAgent)
      ]
    );
    
    return { insertId: result.insertId };
  }
  
  // 生成会话ID
  generateSessionId(userAgent, url) {
    const domain = new URL(url).hostname;
    const hash = this.simpleHash(userAgent + domain + this.getDateString());
    return `session_${hash}_${Date.now()}`;
  }
  
  // 生成用户ID
  generateUserId(userAgent, clientIP) {
    const hash = this.simpleHash(userAgent + (clientIP || ''));
    return `user_${hash}`;
  }
  
  // 生成设备ID
  generateDeviceId(userAgent, clientIP) {
    const hash = this.simpleHash(userAgent + (clientIP || '') + 'device');
    return `device_${hash}`;
  }
  
  // 检测平台
  detectPlatform(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
  
  // 简单哈希函数
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
  
  // 获取日期字符串（用于会话）
  getDateString() {
    return new Date().toDateString();
  }
  
  // 获取SPM统计数据
  async getSPMStats(filters = {}) {
    const { startDate, endDate, spmId, triggerType, url } = filters;
    
    let whereClause = 'WHERE ep.property_key = "spm_id"';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND e.timestamp >= ?';
      params.push(new Date(startDate).getTime());
    }
    
    if (endDate) {
      whereClause += ' AND e.timestamp <= ?';
      params.push(new Date(endDate).getTime());
    }
    
    if (spmId) {
      whereClause += ' AND ep.property_value = ?';
      params.push(spmId);
    }
    
    if (triggerType) {
      whereClause += ' AND e.event_name = ?';
      params.push(`spm_${triggerType}`);
    }
    
    if (url) {
      whereClause += ' AND e.page_url LIKE ?';
      params.push(`%${url}%`);
    }
    
    const sql = `
      SELECT 
        ep.property_value as spm_id,
        e.event_name as trigger_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT e.user_id) as unique_users,
        COUNT(DISTINCT e.session_id) as unique_sessions,
        e.page_url as page_url
      FROM events e
      JOIN event_properties ep ON e.event_id = ep.event_id
      ${whereClause}
      GROUP BY ep.property_value, e.event_name, e.page_url
      ORDER BY total_count DESC
    `;
    
    return await database.query(sql, params);
  }
  
  // 获取热门SPM元素
  async getTopSPMElements(limit = 20, days = 7) {
    const timestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const sql = `
      SELECT 
        ei.spm_id,
        ei.element_tag,
        ei.element_class,
        ei.element_id,
        ei.element_text,
        ei.trigger_type,
        COUNT(*) as interaction_count,
        COUNT(DISTINCT ei.user_id) as unique_users,
        ei.page_url
      FROM element_interactions ei
      WHERE ei.timestamp >= ?
      GROUP BY ei.spm_id, ei.element_tag, ei.element_class, ei.element_id, ei.trigger_type, ei.page_url
      ORDER BY interaction_count DESC
      LIMIT ?
    `;
    
    return await database.query(sql, [timestamp, limit]);
  }
}

module.exports = new SPMTrackingService();