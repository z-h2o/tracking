<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">今日PV</div>
          <div class="stat-card-value">{{ stats.todayPV.toLocaleString() }}</div>
          <div class="stat-card-trend up">
            <el-icon><TrendCharts /></el-icon>
            +12.5%
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">今日UV</div>
          <div class="stat-card-value">{{ stats.todayUV.toLocaleString() }}</div>
          <div class="stat-card-trend up">
            <el-icon><TrendCharts /></el-icon>
            +8.2%
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">活跃用户</div>
          <div class="stat-card-value">{{ stats.activeUsers.toLocaleString() }}</div>
          <div class="stat-card-trend down">
            <el-icon><TrendCharts /></el-icon>
            -2.1%
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">错误数</div>
          <div class="stat-card-value">{{ stats.errors }}</div>
          <div class="stat-card-trend" :class="stats.errors > 50 ? 'down' : 'up'">
            <el-icon><TrendCharts /></el-icon>
            {{ stats.errors > 50 ? '+15.3%' : '-5.2%' }}
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <!-- 访问趋势图 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>访问趋势</span>
              <el-radio-group v-model="trendPeriod" size="small">
                <el-radio-button label="7d">7天</el-radio-button>
                <el-radio-button label="30d">30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <v-chart
              :option="trendChartOption"
              autoresize
              class="chart"
            />
          </div>
        </el-card>
      </el-col>
      
      <!-- 设备分布 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <el-card class="chart-card">
          <template #header>
            <span>设备分布</span>
          </template>
          <div class="chart-container">
            <v-chart
              :option="deviceChartOption"
              autoresize
              class="chart"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 热门页面和实时数据 -->
    <el-row :gutter="20" class="bottom-row">
      <!-- 热门页面 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="data-card">
          <template #header>
            <div class="card-header">
              <span>热门页面</span>
              <el-link type="primary" @click="$router.push('/analytics/pages')">查看更多</el-link>
            </div>
          </template>
          <el-table
            :data="popularPages"
            stripe
            style="width: 100%"
            max-height="300"
          >
            <el-table-column prop="page" label="页面" min-width="200" />
            <el-table-column prop="pv" label="PV" width="80" align="right" />
            <el-table-column prop="uv" label="UV" width="80" align="right" />
            <el-table-column label="占比" width="100" align="right">
              <template #default="{ row }">
                <span>{{ ((row.pv / stats.todayPV) * 100).toFixed(1) }}%</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <!-- 实时数据 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="data-card">
          <template #header>
            <div class="card-header">
              <span>实时数据</span>
              <el-badge :value="realTimeUsers" type="success">
                <el-icon><User /></el-icon>
              </el-badge>
            </div>
          </template>
          <div class="realtime-data">
            <div class="realtime-item">
              <div class="realtime-label">当前在线用户</div>
              <div class="realtime-value">{{ realTimeUsers }}</div>
            </div>
            <div class="realtime-item">
              <div class="realtime-label">最近5分钟事件</div>
              <div class="realtime-value">{{ recentEvents }}</div>
            </div>
            <div class="realtime-item">
              <div class="realtime-label">平均响应时间</div>
              <div class="realtime-value">{{ avgResponseTime }}ms</div>
            </div>
            <div class="realtime-item">
              <div class="realtime-label">错误率</div>
              <div class="realtime-value" :class="errorRate > 5 ? 'error' : 'success'">
                {{ errorRate }}%
              </div>
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
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { dashboardApi, analyticsApi } from '@/services/api'
import { useAsyncApi, usePollingApi } from '@/composables/useApi'
import { ElMessage } from 'element-plus'

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 响应式数据
const trendPeriod = ref('7d')

// API数据获取
const {
  data: dashboardData,
  loading: dashboardLoading,
  refresh: refreshDashboard
} = useAsyncApi(dashboardApi.getDashboardStats, true)

// 实时数据轮询
const {
  data: realtimeData,
  startPolling,
  stopPolling
} = usePollingApi(dashboardApi.getRealTimeStats, 30000, true, 5)

// 设备分析数据
const {
  data: deviceData,
  loading: deviceLoading
} = useAsyncApi(analyticsApi.getDeviceAnalytics, true)

// 计算属性 - 从API数据中提取统计信息
const stats = computed(() => {
  if (!dashboardData.value?.data) {
    return {
      todayPV: 0,
      todayUV: 0,
      activeUsers: 0,
      errors: 0
    }
  }

  const { summary } = dashboardData.value.data
  const realtime = realtimeData.value?.data?.tracking || {}
  
  return {
    todayPV: realtime.total_events || 0,
    todayUV: realtime.active_users || 0,
    activeUsers: realtime.active_sessions || 0,
    errors: summary?.realtime?.errorRate ? Math.round(summary.realtime.errorRate * 10) : 0
  }
})

// 热门页面数据
const popularPages = computed(() => {
  const pages = dashboardData.value?.data?.pages?.data || []
  return pages.slice(0, 5).map((page: any) => ({
    page: page.page_url || page.path,
    pv: page.total_events || page.pv || 0,
    uv: page.unique_users || page.uv || 0
  }))
})

// 实时指标
const realTimeUsers = computed(() => realtimeData.value?.data?.tracking?.active_sessions || 0)
const recentEvents = computed(() => realtimeData.value?.data?.tracking?.total_events || 0)
const avgResponseTime = computed(() => 245) // 可以从性能API获取
const errorRate = computed(() => 
  dashboardData.value?.data?.summary?.realtime?.errorRate || 0
)

// 获取趋势数据
const {
  data: trendData,
  loading: trendLoading,
  refresh: refreshTrend
} = useAsyncApi(analyticsApi.getTrendAnalytics, true, { days: 7, type: 'events' })

// 访问趋势图配置
const trendChartOption = computed(() => {
  const trends = trendData.value?.data?.trends || []
  
  // 处理趋势数据
  const dates: string[] = []
  const pvData: number[] = []
  const uvData: number[] = []
  
  // 如果有API数据，使用API数据
  if (trends.length > 0) {
    trends.forEach((item: any) => {
      dates.push(item.date)
      pvData.push(item.event_count || 0)
      uvData.push(Math.round((item.event_count || 0) * 0.7)) // UV通常是PV的70%左右
    })
  } else {
    // 回退到默认数据
    dates.push(...['周一', '周二', '周三', '周四', '周五', '周六', '周日'])
    pvData.push(...[12000, 13200, 10100, 13400, 15900, 23300, 21000])
    uvData.push(...[8200, 9320, 9010, 9340, 12900, 17300, 18000])
  }

  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['PV', 'UV']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'PV',
        type: 'line',
        data: pvData,
        smooth: true,
        itemStyle: {
          color: '#409eff'
        }
      },
      {
        name: 'UV',
        type: 'line',
        data: uvData,
        smooth: true,
        itemStyle: {
          color: '#67c23a'
        }
      }
    ]
  }
})

// 设备分布图配置
const deviceChartOption = computed(() => {
  const devices = deviceData.value?.data?.devices || []
  
  // 处理设备数据
  let deviceStats = [
    { value: 1048, name: '桌面端' },
    { value: 735, name: '移动端' },
    { value: 580, name: '平板' }
  ]
  
  if (devices.length > 0) {
    const deviceMap = new Map()
    devices.forEach((device: any) => {
      const type = device.device_type === 'desktop' ? '桌面端' :
                   device.device_type === 'mobile' ? '移动端' :
                   device.device_type === 'tablet' ? '平板' : '其他'
      
      const current = deviceMap.get(type) || 0
      deviceMap.set(type, current + (device.event_count || 0))
    })
    
    deviceStats = Array.from(deviceMap.entries()).map(([name, value]) => ({
      value,
      name
    }))
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      bottom: 'bottom'
    },
    series: [
      {
        name: '设备类型',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        data: deviceStats,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

// 监听趋势周期变化，重新获取数据
watch(trendPeriod, (newPeriod) => {
  const days = newPeriod === '7d' ? 7 : 30
  refreshTrend({ days, type: 'events' })
})

// 手动刷新所有数据
const refreshAllData = async () => {
  try {
    await Promise.all([
      refreshDashboard(),
      refreshTrend(),
      deviceLoading.value || Promise.resolve()
    ])
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  }
}

// 组件卸载时停止轮询
onUnmounted(() => {
  stopPolling()
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stats-row {
    margin-bottom: 20px;
  }

  .charts-row {
    margin-bottom: 20px;
  }

  .chart-card {
    height: 420px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .chart-container {
      height: 350px;
      
      .chart {
        width: 100%;
        height: 100%;
      }
    }
  }

  .data-card {
    height: 400px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .realtime-data {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 0;
    
    .realtime-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      
      .realtime-label {
        font-size: 14px;
        color: #666;
      }
      
      .realtime-value {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        
        &.success {
          color: #67c23a;
        }
        
        &.error {
          color: #f56c6c;
        }
      }
    }
  }
}
</style>
