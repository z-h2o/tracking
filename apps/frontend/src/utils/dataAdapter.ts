// 数据适配器 - 将后端API数据格式转换为前端组件需要的格式

import type { PageAnalytics } from '@/types'

/**
 * 适配页面分析数据
 */
export function adaptPageAnalyticsData(apiData: any[]): PageAnalytics[] {
  return apiData.map(item => ({
    path: item.page_url || item.path || '',
    title: item.page_title || item.title || item.page_url || '',
    pv: item.total_events || item.pv || 0,
    uv: item.unique_users || item.uv || 0,
    avgStayTime: item.avg_stay_time || item.avgStayTime || 0,
    bounceRate: item.bounce_rate || item.bounceRate || 0,
    exitRate: item.exit_rate || item.exitRate || 0,
    trend: calculateTrend(item.current_count, item.previous_count) || 0
  }))
}

/**
 * 适配错误数据
 */
export function adaptErrorData(apiData: any[]) {
  return apiData.map(item => ({
    id: item.id || '',
    type: item.error_type || item.type || 'javascript_error',
    message: item.error_message || item.message || '',
    filename: item.error_filename || item.filename,
    lineno: item.error_lineno || item.lineno,
    colno: item.error_colno || item.colno,
    stack: item.error_stack || item.stack,
    pageUrl: item.page_url || item.pageUrl || '',
    pageTitle: item.page_title || item.pageTitle,
    referrer: item.referrer,
    userAgent: item.user_agent || item.userAgent || '',
    count: item.error_count || item.count || 1,
    affectedUsers: item.affected_users || item.affectedUsers || 1,
    level: item.error_level || item.level || 'medium',
    resolved: item.resolved || false,
    lastOccurrence: new Date(item.error_timestamp || item.lastOccurrence || Date.now()).getTime()
  }))
}

/**
 * 适配设备数据
 */
export function adaptDeviceData(apiData: any[]) {
  const deviceMap = new Map()
  
  apiData.forEach(item => {
    const deviceType = item.device_type || 'unknown'
    const typeName = getDeviceTypeName(deviceType)
    const currentCount = deviceMap.get(typeName) || 0
    deviceMap.set(typeName, currentCount + (item.event_count || item.count || 0))
  })
  
  return Array.from(deviceMap.entries()).map(([name, value]) => ({
    name,
    value
  }))
}

/**
 * 适配趋势数据
 */
export function adaptTrendData(apiData: any[]) {
  return {
    dates: apiData.map(item => item.date || item.time),
    events: apiData.map(item => item.event_count || item.events || 0),
    users: apiData.map(item => item.user_count || item.users || 0)
  }
}

/**
 * 适配实时指标数据
 */
export function adaptRealtimeMetrics(apiData: any) {
  const tracking = apiData.tracking || {}
  
  return {
    onlineUsers: tracking.active_sessions || tracking.online_users || 0,
    totalEvents: tracking.total_events || 0,
    activeUsers: tracking.active_users || 0,
    eventsPerSecond: Math.round((tracking.total_events || 0) / 60) || 0,
    errorRate: tracking.error_rate || 0
  }
}

/**
 * 计算趋势百分比
 */
function calculateTrend(current: number, previous: number): number {
  if (!previous || previous === 0) return 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

/**
 * 获取设备类型名称
 */
function getDeviceTypeName(deviceType: string): string {
  switch (deviceType.toLowerCase()) {
    case 'desktop':
      return '桌面端'
    case 'mobile':
      return '移动端'
    case 'tablet':
      return '平板'
    default:
      return '其他'
  }
}

/**
 * 格式化时长
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return `${minutes}分${remainingSeconds}秒`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return `${hours}小时${remainingMinutes}分${remainingSeconds}秒`
}

/**
 * 格式化数字（添加千分位分隔符）
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 安全地获取嵌套对象属性
 */
export function safeGet(obj: any, path: string, defaultValue: any = null): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue
  }, obj)
}

/**
 * 颜色工具
 */
export const colorUtils = {
  success: '#67c23a',
  warning: '#e6a23c',
  danger: '#f56c6c',
  info: '#409eff',
  primary: '#409eff',
  
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'success':
      case 'resolved':
      case 'active':
        return this.success
      case 'warning':
      case 'pending':
        return this.warning
      case 'error':
      case 'danger':
      case 'failed':
        return this.danger
      default:
        return this.info
    }
  },
  
  getErrorLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'critical':
        return this.danger
      case 'high':
        return this.warning
      case 'medium':
        return this.primary
      case 'low':
        return this.success
      default:
        return this.info
    }
  }
}
