// 全局类型定义

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  timestamp?: string
}

export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages?: number
}

export interface TrackingEvent {
  id: string
  sessionId: string
  userId?: string
  eventType: 'click' | 'view' | 'manual' | 'page_view'
  spm?: string
  pageUrl: string
  pageTitle?: string
  referrer?: string
  
  // 元素信息
  elementTag?: string
  elementId?: string
  elementClass?: string
  elementText?: string
  elementAttributes?: Record<string, any>
  
  // 位置信息
  elementX?: number
  elementY?: number
  elementWidth?: number
  elementHeight?: number
  
  // 事件信息
  eventData?: Record<string, any>
  triggerType?: string
  
  // 浏览器信息
  userAgent?: string
  browserLanguage?: string
  timezone?: string
  viewportWidth?: number
  viewportHeight?: number
  
  // 设备信息
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  osName?: string
  browserName?: string
  
  // 业务信息
  appVersion?: string
  customData?: Record<string, any>
  
  // 时间戳
  eventTimestamp: number
  createdAt?: string
  updatedAt?: string
}

export interface ErrorLog {
  id: string
  sessionId: string
  userId?: string
  errorType: 'javascript_error' | 'promise_rejection' | 'resource_error' | 'network_error'
  
  // 错误信息
  errorMessage: string
  errorStack?: string
  errorFilename?: string
  errorLineno?: number
  errorColno?: number
  
  // 页面信息
  pageUrl: string
  pageTitle?: string
  referrer?: string
  
  // 浏览器信息
  userAgent?: string
  browserLanguage?: string
  timezone?: string
  
  // 设备信息
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  osName?: string
  browserName?: string
  
  // 业务信息
  appVersion?: string
  customData?: Record<string, any>
  
  // 错误级别和状态
  errorLevel?: 'low' | 'medium' | 'high' | 'critical'
  resolved?: boolean
  
  // 时间戳
  errorTimestamp: number
  createdAt?: string
  updatedAt?: string
}

export interface DashboardStats {
  todayPV: number
  todayUV: number
  activeUsers: number
  errors: number
}

export interface PageAnalytics {
  path: string
  title: string
  pv: number
  uv: number
  avgStayTime: number
  bounceRate: number
  exitRate: number
  trend: number
}

export interface RealtimeMetrics {
  onlineUsers: number
  eventsPerSecond: number
  avgResponseTime: number
  errorRate: number
}

export interface ChartData {
  time: string[]
  events: number[]
  users: number[]
}

export interface UserSession {
  id: string
  sessionId: string
  userId?: string
  startTime: string
  endTime?: string
  duration?: number
  pageViews: number
  eventsCount: number
  errorsCount: number
  entryPage?: string
  entryReferrer?: string
  exitPage?: string
  userAgent?: string
  deviceType?: string
  osName?: string
  browserName?: string
  browserLanguage?: string
  timezone?: string
  ipAddress?: string
  country?: string
  region?: string
  city?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
