const database = require('../config/database');
const moment = require('moment');

class AnalyticsService {
  // 获取事件统计
  async getEventStats(filters = {}) {
    const { startDate, endDate, eventName, eventCategory, userId } = filters;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(moment(startDate).valueOf());
    }
    
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(moment(endDate).valueOf());
    }
    
    if (eventName) {
      whereClause += ' AND event_name = ?';
      params.push(eventName);
    }
    
    if (eventCategory) {
      whereClause += ' AND event_category = ?';
      params.push(eventCategory);
    }
    
    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    const sql = `
      SELECT 
        event_name,
        event_category,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM events 
      ${whereClause}
      GROUP BY event_name, event_category
      ORDER BY count DESC
    `;
    
    return await database.query(sql, params);
  }

  // 获取页面访问统计
  async getPageViewStats(filters = {}) {
    const { startDate, endDate, pageUrl, userId } = filters;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(moment(startDate).valueOf());
    }
    
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(moment(endDate).valueOf());
    }
    
    if (pageUrl) {
      whereClause += ' AND page_url LIKE ?';
      params.push(`%${pageUrl}%`);
    }
    
    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    const sql = `
      SELECT 
        page_url,
        page_title,
        COUNT(*) as page_views,
        COUNT(DISTINCT user_id) as unique_visitors,
        AVG(duration) as avg_duration,
        AVG(scroll_depth) as avg_scroll_depth
      FROM page_views 
      ${whereClause}
      GROUP BY page_url, page_title
      ORDER BY page_views DESC
    `;
    
    return await database.query(sql, params);
  }

  // 获取用户行为路径
  async getUserJourney(userId, sessionId = null) {
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (sessionId) {
      whereClause += ' AND session_id = ?';
      params.push(sessionId);
    }

    const pageViewSql = `
      SELECT 
        'pageview' as type,
        page_url as action,
        page_title,
        timestamp,
        session_id,
        duration
      FROM page_views 
      ${whereClause}
    `;
    
    const eventSql = `
      SELECT 
        'event' as type,
        CONCAT(event_category, ':', event_name) as action,
        event_name as page_title,
        timestamp,
        session_id,
        NULL as duration
      FROM events 
      ${whereClause}
    `;
    
    const unionSql = `
      (${pageViewSql})
      UNION ALL
      (${eventSql})
      ORDER BY timestamp ASC
    `;
    
    return await database.query(unionSql, [...params, ...params]);
  }

  // 获取时间段内的趋势数据
  async getTrendData(filters = {}) {
    const { startDate, endDate, granularity = 'day' } = filters;
    
    let dateFormat = '%Y-%m-%d';
    let groupBy = 'DATE(FROM_UNIXTIME(timestamp/1000))';
    
    if (granularity === 'hour') {
      dateFormat = '%Y-%m-%d %H:00:00';
      groupBy = 'DATE_FORMAT(FROM_UNIXTIME(timestamp/1000), "%Y-%m-%d %H:00:00")';
    } else if (granularity === 'month') {
      dateFormat = '%Y-%m';
      groupBy = 'DATE_FORMAT(FROM_UNIXTIME(timestamp/1000), "%Y-%m")';
    }
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(moment(startDate).valueOf());
    }
    
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(moment(endDate).valueOf());
    }

    const sql = `
      SELECT 
        ${groupBy} as date_period,
        COUNT(DISTINCT e.user_id) as unique_users,
        COUNT(e.id) as total_events,
        COUNT(DISTINCT e.session_id) as total_sessions,
        COALESCE(pv.page_views, 0) as page_views
      FROM events e
      LEFT JOIN (
        SELECT 
          ${groupBy} as date_period,
          COUNT(*) as page_views
        FROM page_views 
        ${whereClause}
        GROUP BY ${groupBy}
      ) pv ON ${groupBy} = pv.date_period
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY date_period ASC
    `;
    
    return await database.query(sql, [...params, ...params]);
  }

  // 获取实时数据
  async getRealTimeData() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // 最近一小时的活跃用户
    const activeUsersSql = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM events 
      WHERE timestamp >= ?
    `;
    
    // 最近一小时的事件数
    const eventCountSql = `
      SELECT COUNT(*) as event_count
      FROM events 
      WHERE timestamp >= ?
    `;
    
    // 最近一小时的页面访问数
    const pageViewCountSql = `
      SELECT COUNT(*) as page_view_count
      FROM page_views 
      WHERE timestamp >= ?
    `;
    
    // 最近的错误数
    const errorCountSql = `
      SELECT COUNT(*) as error_count
      FROM error_logs 
      WHERE timestamp >= ?
    `;
    
    const [activeUsers] = await database.query(activeUsersSql, [oneHourAgo]);
    const [eventCount] = await database.query(eventCountSql, [oneHourAgo]);
    const [pageViewCount] = await database.query(pageViewCountSql, [oneHourAgo]);
    const [errorCount] = await database.query(errorCountSql, [oneHourAgo]);
    
    return {
      activeUsers: activeUsers.active_users || 0,
      eventCount: eventCount.event_count || 0,
      pageViewCount: pageViewCount.page_view_count || 0,
      errorCount: errorCount.error_count || 0,
      timestamp: now
    };
  }

  // 获取热门页面
  async getTopPages(filters = {}, limit = 10) {
    const { startDate, endDate } = filters;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(moment(startDate).valueOf());
    }
    
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(moment(endDate).valueOf());
    }

    const sql = `
      SELECT 
        page_url,
        page_title,
        COUNT(*) as visits,
        COUNT(DISTINCT user_id) as unique_visitors,
        AVG(duration) as avg_duration
      FROM page_views 
      ${whereClause}
      GROUP BY page_url, page_title
      ORDER BY visits DESC
      LIMIT ?
    `;
    
    params.push(limit);
    return await database.query(sql, params);
  }

  // 获取用户留存数据
  async getRetentionData(cohortDate) {
    const cohortStart = moment(cohortDate).startOf('day').valueOf();
    const cohortEnd = moment(cohortDate).endOf('day').valueOf();
    
    // 获取队列用户
    const cohortUsersSql = `
      SELECT DISTINCT user_id 
      FROM events 
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    
    const cohortUsers = await database.query(cohortUsersSql, [cohortStart, cohortEnd]);
    const userIds = cohortUsers.map(user => user.user_id);
    
    if (userIds.length === 0) {
      return { cohortDate, totalUsers: 0, retention: [] };
    }
    
    const retentionData = [];
    
    // 计算后续30天的留存
    for (let day = 1; day <= 30; day++) {
      const checkDate = moment(cohortDate).add(day, 'days');
      const dayStart = checkDate.startOf('day').valueOf();
      const dayEnd = checkDate.endOf('day').valueOf();
      
      const retainedUsersSql = `
        SELECT COUNT(DISTINCT user_id) as retained_users
        FROM events 
        WHERE user_id IN (${userIds.map(() => '?').join(',')})
        AND timestamp >= ? AND timestamp <= ?
      `;
      
      const [result] = await database.query(retainedUsersSql, [...userIds, dayStart, dayEnd]);
      const retentionRate = (result.retained_users / userIds.length) * 100;
      
      retentionData.push({
        day,
        retainedUsers: result.retained_users,
        retentionRate: Math.round(retentionRate * 100) / 100
      });
    }
    
    return {
      cohortDate,
      totalUsers: userIds.length,
      retention: retentionData
    };
  }

  // 获取错误统计
  async getErrorStats(filters = {}) {
    const { startDate, endDate, errorType } = filters;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(moment(startDate).valueOf());
    }
    
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(moment(endDate).valueOf());
    }
    
    if (errorType) {
      whereClause += ' AND error_type = ?';
      params.push(errorType);
    }

    const sql = `
      SELECT 
        error_type,
        error_message,
        page_url,
        COUNT(*) as error_count,
        COUNT(DISTINCT user_id) as affected_users
      FROM error_logs 
      ${whereClause}
      GROUP BY error_type, error_message, page_url
      ORDER BY error_count DESC
    `;
    
    return await database.query(sql, params);
  }
}

module.exports = new AnalyticsService();