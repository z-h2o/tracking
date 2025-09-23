<template>
  <div class="error-monitoring">
    <!-- 错误统计概览 -->
    <el-row :gutter="20" class="error-stats">
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card error">
          <div class="stat-icon">
            <el-icon size="32"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ errorStats.total }}</div>
            <div class="stat-label">总错误数</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card js">
          <div class="stat-icon">
            <el-icon size="32"><DocumentDelete /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ errorStats.jsErrors }}</div>
            <div class="stat-label">JS错误</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card resource">
          <div class="stat-icon">
            <el-icon size="32"><Picture /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ errorStats.resourceErrors }}</div>
            <div class="stat-label">资源错误</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card network">
          <div class="stat-icon">
            <el-icon size="32"><Connection /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ errorStats.networkErrors }}</div>
            <div class="stat-label">网络错误</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 错误列表 -->
    <el-card class="error-list-card">
      <template #header>
        <div class="card-header">
          <span>错误列表</span>
          <div class="filters">
            <el-select
              v-model="filterType"
              placeholder="错误类型"
              style="width: 140px"
              clearable
            >
              <el-option label="JavaScript错误" value="javascript_error" />
              <el-option label="Promise拒绝" value="promise_rejection" />
              <el-option label="资源错误" value="resource_error" />
              <el-option label="网络错误" value="network_error" />
            </el-select>
            
            <el-select
              v-model="filterLevel"
              placeholder="错误级别"
              style="width: 120px"
              clearable
            >
              <el-option label="严重" value="critical" />
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
            
                <el-button type="primary" @click="handleRefreshErrors">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredErrors"
        v-loading="loading"
        stripe
        @row-click="showErrorDetail"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="error-detail">
              <div class="detail-row">
                <strong>错误堆栈：</strong>
                <pre class="error-stack">{{ row.stack || '暂无堆栈信息' }}</pre>
              </div>
              <div class="detail-row">
                <strong>用户代理：</strong>
                <span>{{ row.userAgent }}</span>
              </div>
              <div class="detail-row">
                <strong>页面URL：</strong>
                <el-link :href="row.pageUrl" target="_blank">{{ row.pageUrl }}</el-link>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="type" label="类型" width="140">
          <template #default="{ row }">
            <el-tag :type="getErrorTypeTag(row.type)" size="small">
              {{ getErrorTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="message" label="错误信息" min-width="300" show-overflow-tooltip />
        
        <el-table-column prop="filename" label="文件" width="200" show-overflow-tooltip />
        
        <el-table-column prop="count" label="次数" width="80" align="right">
          <template #default="{ row }">
            <el-badge :value="row.count" :max="99" type="danger">
              <span>{{ row.count }}</span>
            </el-badge>
          </template>
        </el-table-column>
        
        <el-table-column prop="affectedUsers" label="影响用户" width="100" align="right" />
        
        <el-table-column prop="level" label="级别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getErrorLevelTag(row.level)" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="resolved" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.resolved ? 'success' : 'danger'" size="small">
              {{ row.resolved ? '已解决' : '未解决' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastOccurrence" label="最后发生时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.lastOccurrence) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.resolved ? 'warning' : 'success'"
              @click.stop="toggleResolved(row)"
            >
              {{ row.resolved ? '标记未解决' : '标记已解决' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 错误详情弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`错误详情 - ${currentError?.type}`"
      width="70%"
      :before-close="closeErrorDetail"
    >
      <div v-if="currentError" class="error-detail-dialog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="错误类型">
            <el-tag :type="getErrorTypeTag(currentError.type)">
              {{ getErrorTypeName(currentError.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="错误级别">
            <el-tag :type="getErrorLevelTag(currentError.level)">
              {{ currentError.level }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发生次数">{{ currentError.count }}</el-descriptions-item>
          <el-descriptions-item label="影响用户">{{ currentError.affectedUsers }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ currentError.filename || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="行号">{{ currentError.lineno || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="列号">{{ currentError.colno || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="最后发生时间">{{ formatTime(currentError.lastOccurrence) }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="error-section">
          <h4>错误信息</h4>
          <div class="error-message">{{ currentError.message }}</div>
        </div>
        
        <div class="error-section">
          <h4>错误堆栈</h4>
          <pre class="error-stack">{{ currentError.stack || '暂无堆栈信息' }}</pre>
        </div>
        
        <div class="error-section">
          <h4>页面信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="页面URL">
              <el-link :href="currentError.pageUrl" target="_blank">{{ currentError.pageUrl }}</el-link>
            </el-descriptions-item>
            <el-descriptions-item label="页面标题">{{ currentError.pageTitle || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="来源页面">{{ currentError.referrer || '直接访问' }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="error-section">
          <h4>浏览器信息</h4>
          <div class="user-agent">{{ currentError.userAgent }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { errorApi } from '@/services/api'
import { useAsyncApi, usePaginatedApi } from '@/composables/useApi'

interface ErrorInfo {
  id: string
  type: 'javascript_error' | 'promise_rejection' | 'resource_error' | 'network_error'
  message: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
  pageUrl: string
  pageTitle?: string
  referrer?: string
  userAgent: string
  count: number
  affectedUsers: number
  level: 'critical' | 'high' | 'medium' | 'low'
  resolved: boolean
  lastOccurrence: number
}

// 响应式数据
const filterType = ref('')
const filterLevel = ref('')
const showDetailDialog = ref(false)
const currentError = ref<ErrorInfo | null>(null)

// 获取错误统计数据
const {
  data: errorAnalyticsData,
  loading: analyticsLoading,
  refresh: refreshAnalytics
} = useAsyncApi(errorApi.getErrorAnalytics, true, {
  startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD')
})

// 获取错误列表（分页）
const {
  data: errors,
  loading,
  pagination,
  updateParams,
  refresh: refreshErrors
} = usePaginatedApi<ErrorInfo>(errorApi.getErrors, {
  startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD')
})

// 错误统计 - 从API数据计算
const errorStats = computed(() => {
  const analytics = errorAnalyticsData.value?.data?.statistics || []
  
  const stats = {
    total: 0,
    jsErrors: 0,
    resourceErrors: 0,
    networkErrors: 0
  }
  
  analytics.forEach((stat: any) => {
    stats.total += stat.error_count || 0
    
    switch (stat.error_type) {
      case 'javascript_error':
        stats.jsErrors += stat.error_count || 0
        break
      case 'resource_error':
        stats.resourceErrors += stat.error_count || 0
        break
      case 'network_error':
        stats.networkErrors += stat.error_count || 0
        break
    }
  })
  
  return stats
})

// 过滤后的错误列表（现在通过API参数过滤）
const filteredErrors = computed(() => {
  return errors.value || []
})

// 监听过滤条件变化
watch([filterType, filterLevel], ([newType, newLevel]) => {
  updateParams({
    errorType: newType || undefined,
    errorLevel: newLevel || undefined
  })
})

// 获取错误类型标签样式
const getErrorTypeTag = (type: string) => {
  switch (type) {
    case 'javascript_error':
      return 'danger'
    case 'promise_rejection':
      return 'warning'
    case 'resource_error':
      return 'info'
    case 'network_error':
      return 'danger'
    default:
      return 'info'
  }
}

// 获取错误类型名称
const getErrorTypeName = (type: string) => {
  switch (type) {
    case 'javascript_error':
      return 'JS错误'
    case 'promise_rejection':
      return 'Promise拒绝'
    case 'resource_error':
      return '资源错误'
    case 'network_error':
      return '网络错误'
    default:
      return '未知错误'
  }
}

// 获取错误级别标签样式
const getErrorLevelTag = (level: string) => {
  switch (level) {
    case 'critical':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'primary'
    case 'low':
      return 'success'
    default:
      return 'info'
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// 显示错误详情
const showErrorDetail = (row: ErrorInfo) => {
  currentError.value = row
  showDetailDialog.value = true
}

// 关闭错误详情
const closeErrorDetail = () => {
  showDetailDialog.value = false
  currentError.value = null
}

// 切换解决状态
const toggleResolved = async (row: ErrorInfo) => {
  try {
    if (!row.resolved) {
      await errorApi.markAsResolved(row.id)
    }
    
    // 更新本地状态
    row.resolved = !row.resolved
    ElMessage.success(`已${row.resolved ? '标记为已解决' : '标记为未解决'}`)
    
    // 刷新数据
    refreshErrors()
    refreshAnalytics()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 刷新错误列表
const handleRefreshErrors = async () => {
  try {
    await Promise.all([
      refreshErrors(),
      refreshAnalytics()
    ])
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

// 初始化数据加载
onMounted(() => {
  refreshErrors()
  refreshAnalytics()
})
</script>

<style lang="scss" scoped>
.error-monitoring {
  .error-stats {
    margin-bottom: 20px;
    
    .stat-card {
      display: flex;
      align-items: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      
      .stat-icon {
        margin-right: 15px;
        padding: 15px;
        border-radius: 50%;
      }
      
      .stat-content {
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 14px;
          color: #909399;
        }
      }
      
      &.error .stat-icon {
        background: rgba(245, 108, 108, 0.1);
        color: #f56c6c;
      }
      
      &.js .stat-icon {
        background: rgba(230, 162, 60, 0.1);
        color: #e6a23c;
      }
      
      &.resource .stat-icon {
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }
      
      &.network .stat-icon {
        background: rgba(103, 194, 58, 0.1);
        color: #67c23a;
      }
    }
  }

  .error-list-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .filters {
        display: flex;
        align-items: center;
        gap: 10px;
      }
    }

    .error-detail {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      
      .detail-row {
        margin-bottom: 10px;
        
        strong {
          color: #303133;
          margin-right: 10px;
        }
        
        .error-stack {
          background: #2d3748;
          color: #e2e8f0;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          margin: 5px 0;
        }
      }
    }
  }

  .error-detail-dialog {
    .error-section {
      margin: 20px 0;
      
      h4 {
        margin-bottom: 10px;
        color: #303133;
      }
      
      .error-message {
        padding: 10px;
        background: #fff2f0;
        border: 1px solid #ffccc7;
        border-radius: 4px;
        color: #cf1322;
      }
      
      .error-stack {
        background: #2d3748;
        color: #e2e8f0;
        padding: 15px;
        border-radius: 4px;
        font-size: 12px;
        overflow-x: auto;
        white-space: pre-wrap;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .user-agent {
        padding: 10px;
        background: #f8f9fa;
        border-radius: 4px;
        font-size: 12px;
        word-break: break-all;
      }
    }
  }
}
</style>
