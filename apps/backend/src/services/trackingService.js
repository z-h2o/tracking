import TrackingEvent from '../models/TrackingEvent.js';
import ErrorLog from '../models/ErrorLog.js';
import { normalizeTrackingData } from '../validators/trackingValidator.js';
import logger from '../middlewares/logger.js';

export class TrackingService {
  
  /**
   * 处理单个追踪事件
   */
  static async processEvent(eventData) {
    try {
      const normalizedData = normalizeTrackingData(eventData);
      const trackingEvent = new TrackingEvent(normalizedData);
      await trackingEvent.save();
      
      logger.info('Event processed successfully', {
        eventId: trackingEvent.id,
        eventType: trackingEvent.eventType,
        sessionId: trackingEvent.sessionId
      });
      
      return trackingEvent;
    } catch (error) {
      logger.error('Failed to process event', {
        error: error.message,
        eventData
      });
      throw error;
    }
  }

  /**
   * 批量处理追踪事件
   */
  static async processBatchEvents(eventsData) {
    try {
      const normalizedEvents = eventsData.map(event => normalizeTrackingData(event));
      const result = await TrackingEvent.saveBatch(normalizedEvents);
      
      logger.info('Batch events processed successfully', {
        batchSize: eventsData.length,
        insertedCount: result.affectedRows
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to process batch events', {
        error: error.message,
        batchSize: eventsData.length
      });
      throw error;
    }
  }

  /**
   * 处理错误日志
   */
  static async processError(errorData) {
    try {
      const errorLog = new ErrorLog(errorData);
      await errorLog.save();
      
      logger.info('Error log processed successfully', {
        errorId: errorLog.id,
        errorType: errorLog.errorType,
        sessionId: errorLog.sessionId
      });
      
      return errorLog;
    } catch (error) {
      logger.error('Failed to process error log', {
        error: error.message,
        errorData
      });
      throw error;
    }
  }

  /**
   * 查询追踪事件
   */
  static async queryEvents(options = {}) {
    try {
      let events;
      
      if (options.sessionId) {
        events = await TrackingEvent.findBySessionId(
          options.sessionId, 
          options.limit || 100, 
          options.offset || 0
        );
      } else if (options.userId) {
        events = await TrackingEvent.findByUserId(
          options.userId, 
          options.limit || 100, 
          options.offset || 0
        );
      } else if (options.id) {
        const event = await TrackingEvent.findById(options.id);
        events = event ? [event] : [];
      } else {
        events = await TrackingEvent.findByConditions(options);
      }
      
      logger.info('Events queried successfully', {
        queryType: options.sessionId ? 'sessionId' : 
                  options.userId ? 'userId' : 
                  options.id ? 'id' : 'conditions',
        resultCount: events.length
      });
      
      return events;
    } catch (error) {
      logger.error('Failed to query events', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * 获取实时统计
   */
  static async getRealTimeStats(minutes = 5) {
    try {
      const [trackingStats, errorStats] = await Promise.all([
        TrackingEvent.getRealTimeStats(minutes),
        ErrorLog.getRealTimeErrorStats(minutes)
      ]);

      const stats = {
        timeWindow: `${minutes} minutes`,
        tracking: trackingStats,
        errors: errorStats,
        timestamp: new Date().toISOString()
      };
      
      logger.info('Real-time stats retrieved successfully', {
        timeWindow: stats.timeWindow,
        totalEvents: trackingStats.total_events,
        totalErrors: errorStats.length
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get real-time stats', {
        error: error.message,
        minutes
      });
      throw error;
    }
  }

  /**
   * 获取页面统计
   */
  static async getPageStats(startDate, endDate, limit = 50) {
    try {
      const pageStats = await TrackingEvent.getStatsByPage(startDate, endDate);
      
      logger.info('Page stats retrieved successfully', {
        dateRange: `${startDate} - ${endDate}`,
        resultCount: pageStats.length
      });
      
      return pageStats.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get page stats', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * 获取SPM统计
   */
  static async getSPMStats(startDate, endDate, limit = 50) {
    try {
      const spmStats = await TrackingEvent.getStatsBySPM(startDate, endDate);
      
      logger.info('SPM stats retrieved successfully', {
        dateRange: `${startDate} - ${endDate}`,
        resultCount: spmStats.length
      });
      
      return spmStats.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get SPM stats', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * 数据清理服务
   */
  static async cleanExpiredData(days = 90) {
    try {
      const [trackingResult, errorResult] = await Promise.all([
        TrackingEvent.deleteExpired(days),
        ErrorLog.deleteExpired(days)
      ]);
      
      const cleanupStats = {
        tracking: trackingResult.affectedRows || 0,
        errors: errorResult.affectedRows || 0,
        retentionDays: days,
        timestamp: new Date().toISOString()
      };
      
      logger.info('Data cleanup completed', cleanupStats);
      
      return cleanupStats;
    } catch (error) {
      logger.error('Failed to clean expired data', {
        error: error.message,
        days
      });
      throw error;
    }
  }

  /**
   * 数据验证和增强
   */
  static async validateAndEnhanceData(data) {
    try {
      // 基础数据验证
      if (!data.sessionId) {
        throw new Error('Session ID is required');
      }

      if (!data.eventTimestamp && !data.timestamp) {
        throw new Error('Timestamp is required');
      }

      // 数据增强
      const enhancedData = {
        ...data,
        // 确保时间戳
        eventTimestamp: data.eventTimestamp || data.timestamp || Date.now(),
        // 设置默认事件类型
        eventType: data.eventType || data.trigger || 'manual',
        // 生成缺失的ID
        sessionId: data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      };

      // 设备类型推断
      if (!enhancedData.deviceType && enhancedData.userAgent) {
        enhancedData.deviceType = this.inferDeviceType(enhancedData.userAgent);
      }

      return enhancedData;
    } catch (error) {
      logger.error('Failed to validate and enhance data', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * 根据User Agent推断设备类型
   */
  static inferDeviceType(userAgent) {
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

  /**
   * 会话分析
   */
  static async analyzeSession(sessionId) {
    try {
      const events = await TrackingEvent.findBySessionId(sessionId, 1000);
      
      if (events.length === 0) {
        return null;
      }

      // 按时间排序
      events.sort((a, b) => a.eventTimestamp - b.eventTimestamp);

      const analysis = {
        sessionId,
        totalEvents: events.length,
        startTime: events[0].eventTimestamp,
        endTime: events[events.length - 1].eventTimestamp,
        duration: events[events.length - 1].eventTimestamp - events[0].eventTimestamp,
        pages: [],
        eventTypes: {},
        deviceInfo: {
          deviceType: events[0].deviceType,
          userAgent: events[0].userAgent,
          browserName: events[0].browserName,
          osName: events[0].osName
        }
      };

      // 分析页面访问路径
      const pageVisits = new Map();
      events.forEach(event => {
        if (event.pageUrl) {
          if (!pageVisits.has(event.pageUrl)) {
            pageVisits.set(event.pageUrl, {
              url: event.pageUrl,
              title: event.pageTitle,
              firstVisit: event.eventTimestamp,
              lastVisit: event.eventTimestamp,
              eventCount: 0
            });
          }
          const page = pageVisits.get(event.pageUrl);
          page.lastVisit = event.eventTimestamp;
          page.eventCount++;
        }

        // 统计事件类型
        analysis.eventTypes[event.eventType] = (analysis.eventTypes[event.eventType] || 0) + 1;
      });

      analysis.pages = Array.from(pageVisits.values());
      analysis.uniquePages = analysis.pages.length;

      logger.info('Session analysis completed', {
        sessionId,
        totalEvents: analysis.totalEvents,
        uniquePages: analysis.uniquePages,
        duration: analysis.duration
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze session', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }
}

export default TrackingService;
