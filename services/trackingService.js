const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class TrackingService {
  // 记录事件
  async recordEvent(eventData) {
    const eventId = uuidv4();
    const timestamp = eventData.timestamp || Date.now();
    
    return await database.transaction(async (connection) => {
      // 插入事件记录
      const [eventResult] = await connection.execute(
        `INSERT INTO events 
         (event_id, user_id, session_id, event_name, event_category, 
          page_url, page_title, referrer, ip_address, user_agent, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          eventData.user_id,
          eventData.session_id || null,
          eventData.event_name,
          eventData.event_category || null,
          eventData.page_url || null,
          eventData.page_title || null,
          eventData.referrer || null,
          eventData.ip_address || null,
          eventData.user_agent || null,
          timestamp
        ]
      );

      // 插入事件属性
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

      return { eventId, insertId: eventResult.insertId };
    });
  }

  // 记录页面访问
  async recordPageView(pageViewData) {
    const timestamp = pageViewData.timestamp || Date.now();
    
    const [result] = await database.query(
      `INSERT INTO page_views 
       (user_id, session_id, page_url, page_title, referrer, 
        duration, scroll_depth, ip_address, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pageViewData.user_id,
        pageViewData.session_id || null,
        pageViewData.page_url,
        pageViewData.page_title || null,
        pageViewData.referrer || null,
        pageViewData.duration || 0,
        pageViewData.scroll_depth || 0,
        pageViewData.ip_address || null,
        pageViewData.user_agent || null,
        timestamp
      ]
    );
    
    return { insertId: result.insertId };
  }

  // 记录错误日志
  async recordError(errorData) {
    const timestamp = errorData.timestamp || Date.now();
    
    const [result] = await database.query(
      `INSERT INTO error_logs 
       (user_id, session_id, error_type, error_message, error_stack, 
        page_url, user_agent, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        errorData.user_id || null,
        errorData.session_id || null,
        errorData.error_type,
        errorData.error_message || null,
        errorData.error_stack || null,
        errorData.page_url || null,
        errorData.user_agent || null,
        timestamp
      ]
    );
    
    return { insertId: result.insertId };
  }

  // 创建或更新用户信息
  async upsertUser(userData) {
    const [result] = await database.query(
      `INSERT INTO users (user_id, device_id, user_agent, platform) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       device_id = VALUES(device_id), 
       user_agent = VALUES(user_agent), 
       platform = VALUES(platform), 
       updated_at = CURRENT_TIMESTAMP`,
      [
        userData.user_id,
        userData.device_id || null,
        userData.user_agent || null,
        userData.platform || null
      ]
    );
    
    return { insertId: result.insertId };
  }

  // 批量处理埋点数据
  async batchProcess(batchData) {
    const results = {
      events: [],
      pageViews: [],
      errors: [],
      users: [],
      failed: []
    };

    for (const item of batchData) {
      try {
        switch (item.type) {
          case 'event':
            const eventResult = await this.recordEvent(item.data);
            results.events.push(eventResult);
            break;
          case 'pageView':
            const pageViewResult = await this.recordPageView(item.data);
            results.pageViews.push(pageViewResult);
            break;
          case 'error':
            const errorResult = await this.recordError(item.data);
            results.errors.push(errorResult);
            break;
          case 'user':
            const userResult = await this.upsertUser(item.data);
            results.users.push(userResult);
            break;
          default:
            results.failed.push({ item, reason: '未知的数据类型' });
        }
      } catch (error) {
        console.error('批量处理项目失败:', error);
        results.failed.push({ item, reason: error.message });
      }
    }

    return results;
  }
}

module.exports = new TrackingService();