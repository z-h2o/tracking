<template>
  <div class="realtime">
    <!-- 实时指标 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="metric-card online">
          <div class="metric-icon">
            <el-icon size="32"><User /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.onlineUsers }}</div>
            <div class="metric-label">在线用户</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="metric-card events">
          <div class="metric-icon">
            <el-icon size="32"><TrendCharts /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.eventsPerSecond }}</div>
            <div class="metric-label">事件/秒</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="metric-card response">
          <div class="metric-icon">
            <el-icon size="32"><Timer /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.avgResponseTime }}ms</div>
            <div class="metric-label">响应时间</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="metric-card errors">
          <div class="metric-icon">
            <el-icon size="32"><Warning /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.errorRate }}%</div>
            <div class="metric-label">错误率</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 实时图表 -->
    <el-row :gutter="20" class="charts-row">
      <!-- 实时事件流 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16">
        <el-card class="realtime-chart-card">
          <template #header>
            <div class="card-header">
              <span>实时事件流</span>
              <div class="chart-controls">
                <el-switch
                  v-model="isAutoRefresh"
                  active-text="自动刷新"
                  @change="handleAutoRefreshChange"
                />
                <el-button
                  size="small"
                  type="primary"
                  @click="refreshData"
                  :loading="loading"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </template>
          <div class="chart-container">
            <v-chart
              :option="realtimeChartOption"
              autoresize
              class="chart"
            />
          </div>
        </el-card>
      </el-col>
      
      <!-- 热门页面实时排行 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <el-card class="ranking-card">
          <template #header>
            <span>热门页面（实时）</span>
          </template>
          <div class="ranking-list">
            <div
              v-for="(page, index) in hotPages"
              :key="page.path"
              class="ranking-item"
              :class="{ 'top-3': index < 3 }"
            >
              <div class="ranking-number">{{ index + 1 }}</div>
              <div class="ranking-content">
                <div class="page-path">{{ page.path }}</div>
                <div class="page-views">{{ page.views }} 访问</div>
              </div>
              <div class="ranking-trend">
                <el-icon :color="page.trend > 0 ? '#67c23a' : '#f56c6c'">
                  <CaretTop v-if="page.trend > 0" />
                  <CaretBottom v-else />
                </el-icon>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时事件列表 -->
    <el-row :gutter="20" class="events-row">
      <el-col :span="24">
        <el-card class="events-card">
          <template #header>
            <div class="card-header">
              <span>实时事件流</span>
              <div class="event-filters">
                <el-select
                  v-model="selectedEventType"
                  placeholder="事件类型"
                  size="small"
                  style="width: 120px"
                >
                  <el-option label="全部" value="" />
                  <el-option label="点击" value="click" />
                  <el-option label="浏览" value="view" />
                  <el-option label="错误" value="error" />
                </el-select>
                <el-button
                  size="small"
                  @click="clearEvents"
                  :disabled="realtimeEvents.length === 0"
                >
                  清空
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="events-list" ref="eventsListRef">
            <div
              v-for="event in filteredEvents"
              :key="event.id"
              class="event-item"
              :class="event.type"
            >
              <div class="event-time">
                {{ formatTime(event.timestamp) }}
              </div>
              <div class="event-type">
                <el-tag
                  :type="getEventTagType(event.type)"
                  size="small"
                >
                  {{ getEventTypeName(event.type) }}
                </el-tag>
              </div>
              <div class="event-content">
                <div class="event-page">{{ event.page }}</div>
                <div class="event-details">{{ event.details }}</div>
              </div>
              <div class="event-user">
                <el-tooltip :content="event.userAgent" placement="top">
                  <span>用户{{ event.userId }}</span>
                </el-tooltip>
              </div>
            </div>
            
            <div v-if="filteredEvents.length === 0" class="empty-events">
              <el-empty description="暂无实时事件" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import { dashboardApi, trackingApi } from '@/services/api'
import { usePollingApi, useAsyncApi } from '@/composables/useApi'

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface RealtimeEvent {
  id: string
  timestamp: number
  type: 'click' | 'view' | 'error'
  page: string
  details: string
  userId: string
  userAgent: string
}

// 响应式数据
const loading = ref(false)
const isAutoRefresh = ref(true)
const selectedEventType = ref('')
const eventsListRef = ref<HTMLElement>()

// 实时数据轮询
const {
  data: realtimeData,
  startPolling,
  stopPolling,
  isPolling
} = usePollingApi(dashboardApi.getRealTimeStats, 5000, true, 5)

// 实时指标 - 从API数据计算
const metrics = computed(() => {
  const tracking = realtimeData.value?.data?.tracking || {}
  
  return {
    onlineUsers: tracking.active_sessions || 0,
    eventsPerSecond: Math.round(tracking.total_events / 60) || 0, // 假设total_events是过去一分钟的
    avgResponseTime: 245, // 可以从性能API获取
    errorRate: tracking.error_rate || 0
  }
})

// 热门页面
const hotPages = ref([
  { path: '/home', views: 1847, trend: 1 },
  { path: '/product/list', views: 1234, trend: 1 },
  { path: '/product/detail', views: 987, trend: -1 },
  { path: '/user/profile', views: 765, trend: 1 },
  { path: '/cart', views: 543, trend: -1 },
  { path: '/checkout', views: 321, trend: 1 },
  { path: '/about', views: 198, trend: -1 },
  { path: '/contact', views: 156, trend: 1 }
])

// 实时事件列表
const realtimeEvents = ref<RealtimeEvent[]>([])

// 图表数据
const chartData = ref({
  time: [] as string[],
  events: [] as number[],
  users: [] as number[]
})

// 过滤后的事件
const filteredEvents = computed(() => {
  if (!selectedEventType.value) {
    return realtimeEvents.value
  }
  return realtimeEvents.value.filter(event => event.type === selectedEventType.value)
})

// 实时图表配置
const realtimeChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['事件数', '用户数']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: chartData.value.time
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: '事件数',
      type: 'line',
      data: chartData.value.events,
      smooth: true,
      itemStyle: {
        color: '#409eff'
      }
    },
    {
      name: '用户数',
      type: 'line',
      data: chartData.value.users,
      smooth: true,
      itemStyle: {
        color: '#67c23a'
      }
    }
  ]
}))

// 生成模拟事件
const generateMockEvent = (): RealtimeEvent => {
  const eventTypes = ['click', 'view', 'error'] as const
  const pages = ['/home', '/product/list', '/product/detail', '/user/profile', '/cart']
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    type,
    page: pages[Math.floor(Math.random() * pages.length)],
    details: getEventDetails(type),
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
}

// 获取事件详情
const getEventDetails = (type: string) => {
  switch (type) {
    case 'click':
      return '点击了登录按钮'
    case 'view':
      return '浏览了商品详情'
    case 'error':
      return 'JavaScript 运行时错误'
    default:
      return ''
  }
}

// 获取事件类型标签样式
const getEventTagType = (type: string) => {
  switch (type) {
    case 'click':
      return 'primary'
    case 'view':
      return 'success'
    case 'error':
      return 'danger'
    default:
      return 'info'
  }
}

// 获取事件类型名称
const getEventTypeName = (type: string) => {
  switch (type) {
    case 'click':
      return '点击'
    case 'view':
      return '浏览'
    case 'error':
      return '错误'
    default:
      return '未知'
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  return dayjs(timestamp).format('HH:mm:ss')
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    // 手动触发API调用
    if (isPolling.value) {
      // 如果正在轮询，重启轮询以立即获取新数据
      stopPolling()
      startPolling()
    } else {
      // 如果没有轮询，手动执行一次
      await dashboardApi.getRealTimeStats(5)
    }
    
    // 更新图表数据
    updateChartData()
  } finally {
    loading.value = false
  }
}

// 更新图表数据
const updateChartData = () => {
  const now = dayjs()
  const newTime = now.format('HH:mm:ss')
  const newEvents = Math.floor(Math.random() * 100) + 50
  const newUsers = Math.floor(Math.random() * 50) + 20
  
  chartData.value.time.push(newTime)
  chartData.value.events.push(newEvents)
  chartData.value.users.push(newUsers)
  
  // 只保留最近30个数据点
  if (chartData.value.time.length > 30) {
    chartData.value.time.shift()
    chartData.value.events.shift()
    chartData.value.users.shift()
  }
}

// 添加新事件
const addNewEvent = () => {
  const newEvent = generateMockEvent()
  realtimeEvents.value.unshift(newEvent)
  
  // 只保留最近100个事件
  if (realtimeEvents.value.length > 100) {
    realtimeEvents.value.pop()
  }
  
  // 自动滚动到顶部
  nextTick(() => {
    if (eventsListRef.value) {
      eventsListRef.value.scrollTop = 0
    }
  })
}

// 清空事件
const clearEvents = () => {
  realtimeEvents.value = []
}

// 处理自动刷新变化
const handleAutoRefreshChange = (value: boolean) => {
  if (value) {
    startPolling()
    startRealTimeUpdates()
  } else {
    stopPolling()
    stopRealTimeUpdates()
  }
}

// 定时器
let updateTimer: NodeJS.Timeout | null = null
let eventTimer: NodeJS.Timeout | null = null

// 开始实时更新
const startRealTimeUpdates = () => {
  if (updateTimer) clearInterval(updateTimer)
  if (eventTimer) clearInterval(eventTimer)
  
  // 每5秒更新一次图表数据
  updateTimer = setInterval(() => {
    updateChartData()
  }, 5000)
  
  // 每2秒添加一个新事件
  eventTimer = setInterval(() => {
    addNewEvent()
  }, 2000)
}

// 停止实时更新
const stopRealTimeUpdates = () => {
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
  if (eventTimer) {
    clearInterval(eventTimer)
    eventTimer = null
  }
}

// 初始化图表数据
const initChartData = () => {
  const now = dayjs()
  for (let i = 29; i >= 0; i--) {
    const time = now.subtract(i * 5, 'second').format('HH:mm:ss')
    chartData.value.time.push(time)
    chartData.value.events.push(Math.floor(Math.random() * 100) + 50)
    chartData.value.users.push(Math.floor(Math.random() * 50) + 20)
  }
}

// 组件挂载时初始化
onMounted(() => {
  initChartData()
  
  // 生成初始事件
  for (let i = 0; i < 10; i++) {
    realtimeEvents.value.push(generateMockEvent())
  }
  
  if (isAutoRefresh.value) {
    startPolling()
    startRealTimeUpdates()
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopPolling()
  stopRealTimeUpdates()
})
</script>

<style lang="scss" scoped>
.realtime {
  .metrics-row {
    margin-bottom: 20px;
    
    .metric-card {
      display: flex;
      align-items: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      
      .metric-icon {
        margin-right: 15px;
        padding: 15px;
        border-radius: 50%;
      }
      
      .metric-content {
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 5px;
        }
        
        .metric-label {
          font-size: 14px;
          color: #909399;
        }
      }
      
      &.online .metric-icon {
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }
      
      &.events .metric-icon {
        background: rgba(103, 194, 58, 0.1);
        color: #67c23a;
      }
      
      &.response .metric-icon {
        background: rgba(230, 162, 60, 0.1);
        color: #e6a23c;
      }
      
      &.errors .metric-icon {
        background: rgba(245, 108, 108, 0.1);
        color: #f56c6c;
      }
    }
  }

  .charts-row {
    margin-bottom: 20px;
    
    .realtime-chart-card {
      height: 420px;
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .chart-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }
      }
      
      .chart-container {
        height: 350px;
        
        .chart {
          width: 100%;
          height: 100%;
        }
      }
    }
    
    .ranking-card {
      height: 420px;
      
      .ranking-list {
        max-height: 350px;
        overflow-y: auto;
        
        .ranking-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          
          &.top-3 .ranking-number {
            background: linear-gradient(45deg, #ffd700, #ffed4a);
            color: #fff;
          }
          
          .ranking-number {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f7fa;
            border-radius: 50%;
            font-size: 12px;
            font-weight: bold;
            margin-right: 12px;
          }
          
          .ranking-content {
            flex: 1;
            
            .page-path {
              font-size: 14px;
              color: #303133;
              margin-bottom: 2px;
            }
            
            .page-views {
              font-size: 12px;
              color: #909399;
            }
          }
          
          .ranking-trend {
            font-size: 16px;
          }
        }
      }
    }
  }

  .events-row {
    .events-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .event-filters {
          display: flex;
          align-items: center;
          gap: 10px;
        }
      }
      
      .events-list {
        max-height: 400px;
        overflow-y: auto;
        
        .event-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          animation: slideInDown 0.3s ease-out;
          
          .event-time {
            width: 80px;
            font-size: 12px;
            color: #909399;
            font-family: monospace;
          }
          
          .event-type {
            width: 80px;
            margin-right: 15px;
          }
          
          .event-content {
            flex: 1;
            
            .event-page {
              font-size: 14px;
              color: #303133;
              margin-bottom: 2px;
            }
            
            .event-details {
              font-size: 12px;
              color: #909399;
            }
          }
          
          .event-user {
            width: 100px;
            font-size: 12px;
            color: #909399;
            text-align: right;
          }
        }
        
        .empty-events {
          padding: 40px;
          text-align: center;
        }
      }
    }
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
