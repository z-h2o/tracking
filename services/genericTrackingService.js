const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class GenericTrackingService {
  // 处理通用事件数据
  async processGenericEvent(eventData, metadata = {}) {
    const sessionId = this.generateSessionId(metadata.userAgent, metadata.clientIP);
    const userId = eventData.user_id || eventData.distinct_id || this.generateUserId(metadata.userAgent, metadata.clientIP);
    
    return await database.transaction(async (connection) => {
      // 记录通用事件
      const eventResult = await this.recordGenericEvent(connection, eventData, userId, sessionId, metadata);
      
      // 更新用户信息
      await this.upsertUserInfo(connection, userId, metadata);
      
      return {
        eventId: eventResult.eventId,
        userId,
        sessionId,
        eventName: eventData.event
      };
    });
  }
  
  // 批量处理通用事件数据
  async processGenericBatch(eventDataArray, metadata = {}) {
    const results = [];
    const errors = [];
    
    for (const eventData of eventDataArray) {
      try {
        const result = await this.processGenericEvent(eventData, metadata);
        results.push(result);
      } catch (error) {
        console.error('处理通用事件数据失败:', error);
        errors.push({
          event: eventData.event,
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
  
  // 记录通用事件
  async recordGenericEvent(connection, eventData, userId, sessionId, metadata) {
    const eventId = uuidv4();
    const timestamp = eventData.timestamp || Date.now();
    
    // 从referer获取页面信息
    const pageUrl = eventData.page_url || this.extractUrlFromReferer(metadata.referer);
    const pageTitle = eventData.page_title || '';
    
    const [result] = await connection.execute(
      `INSERT INTO events 
       (event_id, user_id, session_id, event_name, event_category, 
        page_url, page_title, referrer, ip_address, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        userId,
        sessionId,
        eventData.event,
        'generic_tracking', // 通用事件分类
        pageUrl || null,
        pageTitle || null,
        metadata.referer || null,
        metadata.clientIP || null,
        metadata.userAgent || null,
        timestamp
      ]
    );
    
    // 记录事件属性
    if (eventData.properties && Object.keys(eventData.properties).length > 0) {
      const propertyPromises = Object.entries(eventData.properties).map(([key, value]) => {
        const propertyType = typeof value;
        const propertyValue = propertyType === 'object' ? JSON.stringify(value) : String(value);
        
        return connection.execute(
          `INSERT INTO event_properties (event_id, property_key, property_value, property_type) 
           VALUES (?, ?, ?, ?)`,
          [eventId, key, propertyValue, propertyType]
        );
      });
      
      await Promise.all(propertyPromises);
    }
    
    // 记录通用的元数据属性
    const metadataProperties = {
      request_method: metadata.method,
      client_ip: metadata.clientIP,
      user_agent: metadata.userAgent,
      referer: metadata.referer,
      timestamp: metadata.timestamp
    };
    
    const metadataPromises = Object.entries(metadataProperties).map(([key, value]) => {
      if (value !== null && value !== undefined) {
        return connection.execute(
          `INSERT INTO event_properties (event_id, property_key, property_value, property_type) 
           VALUES (?, ?, ?, ?)`,
          [eventId, `meta_${key}`, String(value), 'string']
        );
      }
    }).filter(Boolean);
    
    await Promise.all(metadataPromises);
    
    return { eventId, insertId: result.insertId };
  }
  
  // 更新用户信息
  async upsertUserInfo(connection, userId, metadata) {
    const platform = this.detectPlatform(metadata.userAgent);
    const deviceId = this.generateDeviceId(metadata.userAgent, metadata.clientIP);
    
    const [result] = await connection.execute(
      `INSERT INTO users (user_id, device_id, user_agent, platform) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       user_agent = VALUES(user_agent), 
       platform = VALUES(platform), 
       updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        deviceId,
        metadata.userAgent || null,
        platform
      ]
    );
    
    return { insertId: result.insertId };
  }
  
  // 从Referer提取URL
  extractUrlFromReferer(referer) {
    if (!referer) return null;
    try {
      const url = new URL(referer);
      return url.href;
    } catch (e) {
      return referer;
    }
  }
  
  // 生成会话ID
  generateSessionId(userAgent = '', clientIP = '') {
    const hash = this.simpleHash(userAgent + clientIP + this.getDateString());
    return `session_${hash}_${Date.now()}`;
  }
  
  // 生成用户ID
  generateUserId(userAgent = '', clientIP = '') {
    const hash = this.simpleHash(userAgent + clientIP);
    return `user_${hash}`;
  }
  
  // 生成设备ID
  generateDeviceId(userAgent = '', clientIP = '') {
    const hash = this.simpleHash(userAgent + clientIP + 'device');
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
  
  // 获取通用事件统计
  async getGenericEventStats(filters = {}) {
    const { startDate, endDate, eventName, userId } = filters;
    
    let whereClause = 'WHERE event_category = "generic_tracking"';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(new Date(startDate).getTime());
    }
    
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(new Date(endDate).getTime());
    }
    
    if (eventName) {
      whereClause += ' AND event_name = ?';
      params.push(eventName);
    }
    
    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }
    
    const sql = `
      SELECT 
        event_name,
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        DATE(FROM_UNIXTIME(timestamp/1000)) as event_date
      FROM events 
      ${whereClause}
      GROUP BY event_name, DATE(FROM_UNIXTIME(timestamp/1000))
      ORDER BY total_count DESC
    `;
    
    return await database.query(sql, params);
  }
}

module.exports = new GenericTrackingService();