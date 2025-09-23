import TrackingEvent from '../models/TrackingEvent.js';
import ErrorLog from '../models/ErrorLog.js';
import logger from '../middlewares/logger.js';

export class AnalyticsService {
  
  /**
   * 获取仪表板数据
   */
  static async getDashboardData(startDate, endDate) {
    try {
      const defaultEndDate = endDate || new Date();
      const defaultStartDate = startDate || new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 并行获取各种统计数据
      const [
        pageStats,
        spmStats,
        errorStats,
        realtimeStats,
        deviceStats,
        eventTrend
      ] = await Promise.all([
        TrackingEvent.getStatsByPage(defaultStartDate, defaultEndDate),
        TrackingEvent.getStatsBySPM(defaultStartDate, defaultEndDate),
        ErrorLog.getErrorStats(defaultStartDate, defaultEndDate),
        TrackingEvent.getRealTimeStats(5),
        TrackingEvent.getDeviceStats(defaultStartDate, defaultEndDate),
        TrackingEvent.getEventTrend(7)
      ]);

      const dashboard = {
        dateRange: {
          start: defaultStartDate.toISOString(),
          end: defaultEndDate.toISOString()
        },
        summary: {
          realtime: realtimeStats,
          totalPages: pageStats.length,
          totalSPMs: spmStats.length,
          totalErrors: errorStats.reduce((sum, stat) => sum + stat.error_count, 0)
        },
        topPages: pageStats.slice(0, 10),
        topSPMs: spmStats.slice(0, 10),
        errorSummary: errorStats.slice(0, 5),
        deviceDistribution: this.aggregateDeviceStats(deviceStats),
        eventTrend: eventTrend
      };

      logger.info('Dashboard data retrieved successfully', {
        dateRange: `${defaultStartDate.toISOString()} - ${defaultEndDate.toISOString()}`,
        topPagesCount: dashboard.topPages.length,
        topSPMsCount: dashboard.topSPMs.length
      });

      return dashboard;
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * 获取趋势分析数据
   */
  static async getTrendAnalysis(days = 7, type = 'events') {
    try {
      let trendData;
      
      if (type === 'errors') {
        trendData = await ErrorLog.getErrorTrend(days);
      } else {
        trendData = await TrackingEvent.getEventTrend(days);
      }

      // 数据处理和格式化
      const processedTrend = this.processTrendData(trendData, days);

      logger.info('Trend analysis completed', {
        type,
        days,
        dataPoints: processedTrend.length
      });

      return {
        type,
        timeRange: `${days} days`,
        data: processedTrend,
        summary: this.calculateTrendSummary(processedTrend)
      };
    } catch (error) {
      logger.error('Failed to get trend analysis', {
        error: error.message,
        days,
        type
      });
      throw error;
    }
  }

  /**
   * 用户行为分析
   */
  static async analyzeUserBehavior(userId, sessionId, options = {}) {
    try {
      if (!userId && !sessionId) {
        throw new Error('Either userId or sessionId is required');
      }

      const events = userId ? 
        await TrackingEvent.findByUserId(userId, options.limit || 1000) :
        await TrackingEvent.findBySessionId(sessionId, options.limit || 1000);
      
      if (events.length === 0) {
        return null;
      }

      const analysis = this.processBehaviorData(events);
      
      logger.info('User behavior analysis completed', {
        userId,
        sessionId,
        totalEvents: events.length,
        uniquePages: analysis.pageFlow.length
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze user behavior', {
        error: error.message,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * 漏斗分析
   */
  static async getFunnelAnalysis(steps, startDate, endDate) {
    try {
      const funnelData = [];
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let stepData;
        
        if (step.type === 'page') {
          stepData = await this.getPageFunnelData(step, startDate, endDate);
        } else if (step.type === 'spm') {
          stepData = await this.getSPMFunnelData(step, startDate, endDate);
        } else {
          stepData = await this.getEventFunnelData(step, startDate, endDate);
        }
        
        funnelData.push({
          step: i + 1,
          name: step.name,
          ...stepData
        });
      }

      // 计算转化率
      const funnelWithConversion = this.calculateConversionRates(funnelData);

      logger.info('Funnel analysis completed', {
        steps: steps.length,
        dateRange: `${startDate} - ${endDate}`
      });

      return {
        steps: funnelWithConversion,
        dateRange: {
          start: startDate,
          end: endDate
        },
        summary: {
          totalSteps: steps.length,
          overallConversion: funnelWithConversion.length > 0 ? 
            (funnelWithConversion[funnelWithConversion.length - 1].users / funnelWithConversion[0].users * 100).toFixed(2) + '%' : '0%'
        }
      };
    } catch (error) {
      logger.error('Failed to get funnel analysis', {
        error: error.message,
        steps: steps.length
      });
      throw error;
    }
  }

  /**
   * 热力图数据分析
   */
  static async getHeatmapAnalysis(pageUrl, startDate, endDate) {
    try {
      const heatmapData = await TrackingEvent.getHeatmapData(pageUrl, startDate, endDate);
      
      const analysis = {
        pageUrl,
        dateRange: {
          start: startDate,
          end: endDate
        },
        totalClicks: heatmapData.reduce((sum, item) => sum + item.click_count, 0),
        uniqueElements: heatmapData.length,
        clickDistribution: this.processHeatmapData(heatmapData),
        topElements: heatmapData.slice(0, 20)
      };

      logger.info('Heatmap analysis completed', {
        pageUrl,
        totalClicks: analysis.totalClicks,
        uniqueElements: analysis.uniqueElements
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to get heatmap analysis', {
        error: error.message,
        pageUrl
      });
      throw error;
    }
  }

  /**
   * 错误分析
   */
  static async getErrorAnalysis(startDate, endDate, options = {}) {
    try {
      const [errorStats, topErrors, errorTrend] = await Promise.all([
        ErrorLog.getErrorStats(startDate, endDate),
        ErrorLog.getTopErrors(options.limit || 10, 7),
        ErrorLog.getErrorTrend(7)
      ]);

      const analysis = {
        dateRange: {
          start: startDate,
          end: endDate
        },
        summary: {
          totalErrors: errorStats.reduce((sum, stat) => sum + stat.total_errors, 0),
          errorTypes: errorStats.length,
          affectedSessions: errorStats.reduce((sum, stat) => sum + stat.affected_sessions, 0)
        },
        distribution: errorStats,
        topErrors: topErrors,
        trend: errorTrend,
        severity: this.categorizeErrorSeverity(topErrors)
      };

      logger.info('Error analysis completed', {
        totalErrors: analysis.summary.totalErrors,
        errorTypes: analysis.summary.errorTypes
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to get error analysis', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * 性能分析（预留接口）
   */
  static async getPerformanceAnalysis(startDate, endDate) {
    try {
      // 这里可以实现性能数据的分析
      // 目前返回模拟数据
      const performanceData = {
        dateRange: {
          start: startDate,
          end: endDate
        },
        summary: {
          avgLoadTime: 0,
          avgDOMReady: 0,
          avgFirstPaint: 0
        },
        // 可以扩展更多性能指标
      };

      logger.info('Performance analysis completed');
      return performanceData;
    } catch (error) {
      logger.error('Failed to get performance analysis', {
        error: error.message
      });
      throw error;
    }
  }

  // 辅助方法

  /**
   * 聚合设备统计数据
   */
  static aggregateDeviceStats(deviceStats) {
    const aggregated = {
      byDeviceType: {},
      byOS: {},
      byBrowser: {}
    };

    deviceStats.forEach(stat => {
      // 按设备类型聚合
      if (!aggregated.byDeviceType[stat.device_type]) {
        aggregated.byDeviceType[stat.device_type] = {
          eventCount: 0,
          uniqueSessions: 0,
          uniqueUsers: 0
        };
      }
      aggregated.byDeviceType[stat.device_type].eventCount += stat.event_count;
      aggregated.byDeviceType[stat.device_type].uniqueSessions += stat.unique_sessions;
      aggregated.byDeviceType[stat.device_type].uniqueUsers += stat.unique_users;

      // 按操作系统聚合
      if (stat.os_name) {
        if (!aggregated.byOS[stat.os_name]) {
          aggregated.byOS[stat.os_name] = { eventCount: 0, uniqueSessions: 0 };
        }
        aggregated.byOS[stat.os_name].eventCount += stat.event_count;
        aggregated.byOS[stat.os_name].uniqueSessions += stat.unique_sessions;
      }

      // 按浏览器聚合
      if (stat.browser_name) {
        if (!aggregated.byBrowser[stat.browser_name]) {
          aggregated.byBrowser[stat.browser_name] = { eventCount: 0, uniqueSessions: 0 };
        }
        aggregated.byBrowser[stat.browser_name].eventCount += stat.event_count;
        aggregated.byBrowser[stat.browser_name].uniqueSessions += stat.unique_sessions;
      }
    });

    return aggregated;
  }

  /**
   * 处理趋势数据
   */
  static processTrendData(trendData, days) {
    // 确保所有日期都有数据，缺失的用0填充
    const dateMap = new Map();
    const today = new Date();
    
    // 生成日期范围
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { date: dateStr, eventCount: 0, eventTypes: {} });
    }

    // 填充实际数据
    trendData.forEach(item => {
      const dateStr = item.date;
      if (dateMap.has(dateStr)) {
        const dayData = dateMap.get(dateStr);
        dayData.eventCount += item.event_count;
        dayData.eventTypes[item.event_type] = item.event_count;
      }
    });

    return Array.from(dateMap.values());
  }

  /**
   * 计算趋势摘要
   */
  static calculateTrendSummary(trendData) {
    if (trendData.length === 0) return null;

    const totalEvents = trendData.reduce((sum, day) => sum + day.eventCount, 0);
    const avgDaily = totalEvents / trendData.length;
    
    // 计算增长率（最后一天vs前一天）
    const growth = trendData.length >= 2 ? 
      ((trendData[trendData.length - 1].eventCount - trendData[trendData.length - 2].eventCount) / 
       Math.max(trendData[trendData.length - 2].eventCount, 1) * 100).toFixed(2) : 0;

    return {
      totalEvents,
      avgDaily: Math.round(avgDaily),
      growth: `${growth}%`,
      peakDay: trendData.reduce((peak, day) => day.eventCount > peak.eventCount ? day : peak, trendData[0])
    };
  }

  /**
   * 处理用户行为数据
   */
  static processBehaviorData(events) {
    // 按时间排序
    events.sort((a, b) => a.eventTimestamp - b.eventTimestamp);

    const pageFlow = [];
    const eventTypes = {};
    let currentPage = null;
    let pageStartTime = null;

    events.forEach(event => {
      // 统计事件类型
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;

      // 分析页面流转
      if (event.pageUrl && event.pageUrl !== currentPage) {
        if (currentPage && pageStartTime) {
          // 记录上一个页面的停留时间
          const lastPage = pageFlow[pageFlow.length - 1];
          if (lastPage) {
            lastPage.duration = event.eventTimestamp - pageStartTime;
          }
        }

        pageFlow.push({
          url: event.pageUrl,
          title: event.pageTitle,
          timestamp: event.eventTimestamp,
          duration: null // 将在下次页面变化时计算
        });

        currentPage = event.pageUrl;
        pageStartTime = event.eventTimestamp;
      }
    });

    return {
      sessionId: events[0]?.sessionId,
      userId: events[0]?.userId,
      totalEvents: events.length,
      timespan: {
        start: events[0]?.eventTimestamp,
        end: events[events.length - 1]?.eventTimestamp,
        duration: events[events.length - 1]?.eventTimestamp - events[0]?.eventTimestamp
      },
      pageFlow,
      eventTypes,
      deviceInfo: {
        deviceType: events[0]?.deviceType,
        userAgent: events[0]?.userAgent,
        browserName: events[0]?.browserName
      }
    };
  }

  /**
   * 处理热力图数据
   */
  static processHeatmapData(heatmapData) {
    return heatmapData.map(item => ({
      x: item.x,
      y: item.y,
      value: item.click_count,
      element: {
        tag: item.element_tag,
        text: item.element_text,
        spm: item.spm
      }
    }));
  }

  /**
   * 计算转化率
   */
  static calculateConversionRates(funnelData) {
    if (funnelData.length === 0) return [];

    const firstStepUsers = funnelData[0].users || 0;
    
    return funnelData.map((step, index) => ({
      ...step,
      conversionRate: index === 0 ? 100 : 
        (firstStepUsers > 0 ? (step.users / firstStepUsers * 100).toFixed(2) : 0),
      stepConversionRate: index === 0 ? 100 :
        (funnelData[index - 1].users > 0 ? (step.users / funnelData[index - 1].users * 100).toFixed(2) : 0)
    }));
  }

  /**
   * 错误严重程度分类
   */
  static categorizeErrorSeverity(topErrors) {
    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    
    topErrors.forEach(error => {
      if (error.error_count > 100) {
        severity.critical++;
      } else if (error.error_count > 50) {
        severity.high++;
      } else if (error.error_count > 10) {
        severity.medium++;
      } else {
        severity.low++;
      }
    });

    return severity;
  }

  // 漏斗分析辅助方法（简化实现）
  static async getPageFunnelData(step, startDate, endDate) {
    // 实现页面漏斗数据获取逻辑
    return { users: 0, events: 0 };
  }

  static async getSPMFunnelData(step, startDate, endDate) {
    // 实现SPM漏斗数据获取逻辑
    return { users: 0, events: 0 };
  }

  static async getEventFunnelData(step, startDate, endDate) {
    // 实现事件漏斗数据获取逻辑
    return { users: 0, events: 0 };
  }
}

export default AnalyticsService;
