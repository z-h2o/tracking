import request from '@/utils/request'
import type { 
  ApiResponse, 
  TrackingEvent, 
  ErrorLog, 
  DashboardStats,
  PageAnalytics,
  RealtimeMetrics
} from '@/types'

// 仪表板相关API
export const dashboardApi = {
  // 获取仪表板统计数据
  getDashboardStats: (params?: { startDate?: string; endDate?: string }) => {
    return request.get<ApiResponse<{
      summary: {
        dateRange: { start: string; end: string }
        realtime: RealtimeMetrics
      }
      pages: { title: string; data: PageAnalytics[] }
      spm: { title: string; data: any[] }
      errors: { title: string; data: any[] }
    }>>('/analytics/dashboard', { params })
  },

  // 获取实时统计数据
  getRealTimeStats: (minutes: number = 5) => {
    return request.get<ApiResponse<{
      timeWindow: string
      tracking: {
        total_events: number
        active_sessions: number
        active_users: number
      }
      errors: any[]
      timestamp: string
    }>>('/analytics/realtime', { params: { minutes } })
  }
}

// 页面分析相关API
export const analyticsApi = {
  // 获取页面分析数据
  getPageAnalytics: (params: {
    startDate?: string
    endDate?: string
    limit?: number
    page?: number
    sortBy?: string
    sortOrder?: string
  }) => {
    return request.get<ApiResponse<{
      dateRange: { start: string; end: string }
      pages: PageAnalytics[]
      total: number
    }>>('/analytics/pages', { params })
  },

  // 获取SPM分析数据
  getSPMAnalytics: (params: {
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    return request.get<ApiResponse<{
      dateRange: { start: string; end: string }
      spm: any[]
      total: number
    }>>('/analytics/spm', { params })
  },

  // 获取设备分析数据
  getDeviceAnalytics: (params: {
    startDate?: string
    endDate?: string
  }) => {
    return request.get<ApiResponse<{
      dateRange: { start: string; end: string }
      devices: any[]
    }>>('/analytics/devices', { params })
  },

  // 获取趋势分析数据
  getTrendAnalytics: (params: {
    days?: number
    type?: 'events' | 'errors'
  }) => {
    return request.get<ApiResponse<{
      type: string
      timeRange: string
      trends: any[]
    }>>('/analytics/trends', { params })
  },

  // 获取用户行为分析
  getUserBehavior: (params: {
    userId?: string
    sessionId?: string
    startDate?: string
    endDate?: string
  }) => {
    return request.get<ApiResponse<{
      userId?: string
      sessionId?: string
      behaviorPath: any[]
      pageStayTimes: Record<string, number>
      totalEvents: number
      uniquePages: number
    }>>('/analytics/user-behavior', { params })
  },

  // 获取热力图数据
  getHeatmapData: (params: {
    pageUrl: string
    startDate?: string
    endDate?: string
  }) => {
    return request.get<ApiResponse<{
      pageUrl: string
      dateRange: { start: string; end: string }
      heatmap: any[]
    }>>('/analytics/heatmap', { params })
  }
}

// 埋点事件相关API
export const trackingApi = {
  // 获取埋点事件列表
  getEvents: (params: {
    startDate?: string
    endDate?: string
    sessionId?: string
    userId?: string
    eventType?: string
    spm?: string
    pageUrl?: string
    deviceType?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
  }) => {
    return request.get<ApiResponse<TrackingEvent[]>>('/tracking/events', { params })
  },

  // 根据ID获取单个事件
  getEventById: (id: string) => {
    return request.get<ApiResponse<TrackingEvent>>(`/tracking/events/${id}`)
  },

  // 提交单个埋点事件
  submitEvent: (data: Partial<TrackingEvent>) => {
    return request.post<ApiResponse<{ id: string }>>('/tracking/events', data)
  },

  // 批量提交埋点事件
  submitBatchEvents: (data: Partial<TrackingEvent>[]) => {
    return request.post<ApiResponse<{ insertedCount: number }>>('/tracking/events/batch', data)
  },

  // 获取实时统计
  getRealTimeStats: (minutes: number = 5) => {
    return request.get<ApiResponse<{
      tracking: RealtimeMetrics
      errors: any[]
      timeWindow: string
    }>>('/tracking/stats/realtime', { params: { minutes } })
  }
}

// 错误监控相关API
export const errorApi = {
  // 获取错误日志列表
  getErrors: (params: {
    startDate?: string
    endDate?: string
    errorType?: string
    errorLevel?: string
    resolved?: boolean
    sessionId?: string
    userId?: string
    page?: number
    limit?: number
  }) => {
    return request.get<ApiResponse<ErrorLog[]>>('/tracking/errors', { params })
  },

  // 提交错误日志
  submitError: (data: Partial<ErrorLog>) => {
    return request.post<ApiResponse<{ id: string }>>('/tracking/errors', data)
  },

  // 获取错误分析数据
  getErrorAnalytics: (params: {
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    return request.get<ApiResponse<{
      dateRange: { start: string; end: string }
      statistics: any[]
      topErrors: any[]
      trend: any[]
    }>>('/analytics/errors', { params })
  },

  // 标记错误为已解决
  markAsResolved: (id: string) => {
    return request.patch<ApiResponse<void>>(`/errors/${id}/resolve`)
  },

  // 更新错误级别
  updateErrorLevel: (id: string, level: string) => {
    return request.patch<ApiResponse<void>>(`/errors/${id}/level`, { level })
  }
}

// 健康检查API
export const healthApi = {
  // 基础健康检查
  getHealthStatus: () => {
    return request.get<ApiResponse<{
      status: string
      timestamp: string
      uptime: number
      environment: string
    }>>('/health')
  },

  // 详细健康检查
  getDetailedHealth: () => {
    return request.get<ApiResponse<{
      status: string
      timestamp: string
      responseTime: string
      environment: string
      services: Record<string, any>
      system: Record<string, any>
      memory: Record<string, string>
    }>>('/health/detailed')
  },

  // 数据库连接检查
  getDatabaseStatus: () => {
    return request.get<ApiResponse<{
      status: string
      responseTime: string
      timestamp: string
    }>>('/health/db')
  }
}
