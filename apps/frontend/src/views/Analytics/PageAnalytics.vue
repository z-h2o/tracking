<template>
  <div class="page-analytics">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>页面分析</h2>
      <div class="header-controls">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="handleDateChange"
        />
        <el-button type="primary" @click="exportData">导出数据</el-button>
      </div>
    </div>

    <!-- 总览统计 -->
    <el-row :gutter="20" class="overview-row">
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">总页面浏览量</div>
          <div class="stat-card-value">{{ overview.totalPV.toLocaleString() }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">独立访客数</div>
          <div class="stat-card-value">{{ overview.totalUV.toLocaleString() }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">平均停留时间</div>
          <div class="stat-card-value">{{ overview.avgStayTime }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
        <div class="stat-card">
          <div class="stat-card-title">跳出率</div>
          <div class="stat-card-value">{{ overview.bounceRate }}%</div>
        </div>
      </el-col>
    </el-row>

    <!-- 页面详细数据 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>页面详细数据</span>
          <div class="table-controls">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索页面路径"
              style="width: 200px"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredPageData"
        stripe
        v-loading="loading"
        @sort-change="handleSortChange"
      >
        <el-table-column
          prop="path"
          label="页面路径"
          min-width="300"
          show-overflow-tooltip
        />
        <el-table-column
          prop="title"
          label="页面标题"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="pv"
          label="页面浏览量"
          width="120"
          sortable="custom"
          align="right"
        >
          <template #default="{ row }">
            {{ row.pv.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          prop="uv"
          label="独立访客"
          width="120"
          sortable="custom"
          align="right"
        >
          <template #default="{ row }">
            {{ row.uv.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column
          prop="avgStayTime"
          label="平均停留时间"
          width="140"
          align="right"
        >
          <template #default="{ row }">
            {{ formatDuration(row.avgStayTime) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="bounceRate"
          label="跳出率"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            {{ row.bounceRate }}%
          </template>
        </el-table-column>
        <el-table-column
          prop="exitRate"
          label="退出率"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            {{ row.exitRate }}%
          </template>
        </el-table-column>
        <el-table-column
          label="趋势"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <div class="trend-indicator">
              <el-icon
                :color="row.trend > 0 ? '#67c23a' : row.trend < 0 ? '#f56c6c' : '#909399'"
                size="16"
              >
                <CaretTop v-if="row.trend > 0" />
                <CaretBottom v-else-if="row.trend < 0" />
                <Minus v-else />
              </el-icon>
              <span
                :style="{ color: row.trend > 0 ? '#67c23a' : row.trend < 0 ? '#f56c6c' : '#909399' }"
              >
                {{ Math.abs(row.trend) }}%
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              @click="viewPageDetail(row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { analyticsApi } from '@/services/api'
import { usePaginatedApi } from '@/composables/useApi'

interface PageData {
  path: string
  title: string
  pv: number
  uv: number
  avgStayTime: number
  bounceRate: number
  exitRate: number
  trend: number
}

// 响应式数据
const searchKeyword = ref('')
const dateRange = ref<[Date, Date]>([
  dayjs().subtract(7, 'day').toDate(),
  dayjs().toDate()
])

// 使用分页API
const {
  data: pageData,
  loading,
  pagination,
  updateParams,
  changePage,
  changePageSize,
  refresh: refreshData
} = usePaginatedApi<PageData>(analyticsApi.getPageAnalytics, {
  startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD')
})

// 总览数据 - 从API数据计算
const overview = computed(() => {
  const pages = pageData.value || []
  const totalPV = pages.reduce((sum, page) => sum + page.pv, 0)
  const totalUV = pages.reduce((sum, page) => sum + page.uv, 0)
  const avgStayTime = pages.length > 0 
    ? Math.round(pages.reduce((sum, page) => sum + page.avgStayTime, 0) / pages.length)
    : 0
  const avgBounceRate = pages.length > 0
    ? Math.round(pages.reduce((sum, page) => sum + page.bounceRate, 0) / pages.length * 10) / 10
    : 0

  return {
    totalPV,
    totalUV,
    avgStayTime: formatDuration(avgStayTime),
    bounceRate: avgBounceRate
  }
})

// 过滤后的页面数据（现在由API处理分页，所以直接返回数据）
const filteredPageData = computed(() => {
  return pageData.value || []
})

// 格式化时长
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

// 处理日期变化
const handleDateChange = (dates: [Date, Date] | null) => {
  if (dates) {
    dateRange.value = dates
    updateParams({
      startDate: dayjs(dates[0]).format('YYYY-MM-DD'),
      endDate: dayjs(dates[1]).format('YYYY-MM-DD')
    })
  }
}

// 处理排序变化
const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  const sortBy = prop
  const sortOrder = order === 'ascending' ? 'asc' : 'desc'
  
  updateParams({
    sortBy,
    sortOrder
  })
}

// 处理分页大小变化
const handleSizeChange = (size: number) => {
  changePageSize(size)
}

// 处理当前页变化
const handleCurrentChange = (page: number) => {
  changePage(page)
}

// 处理搜索
const handleSearch = () => {
  updateParams({
    search: searchKeyword.value
  })
}

// 监听搜索关键词变化
watch(searchKeyword, (newKeyword) => {
  // 防抖处理
  setTimeout(() => {
    handleSearch()
  }, 500)
})

// 查看页面详情
const viewPageDetail = (row: PageData) => {
  ElMessage.info(`查看页面详情: ${row.path}`)
  // 这里可以跳转到详情页面或打开弹窗
}

// 导出数据
const exportData = async () => {
  try {
    ElMessage.info('正在导出数据...')
    // 这里可以调用导出API
    // const response = await analyticsApi.exportPageAnalytics(...)
    ElMessage.success('数据导出功能开发中...')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 初始化时加载数据
onMounted(() => {
  refreshData()
})
</script>

<style lang="scss" scoped>
.page-analytics {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      color: #303133;
    }
    
    .header-controls {
      display: flex;
      align-items: center;
      gap: 15px;
    }
  }

  .overview-row {
    margin-bottom: 20px;
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .trend-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .pagination-wrapper {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
