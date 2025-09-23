import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * 通用API调用组合式函数
 */
export function useApi<T>(apiFunction: (...args: any[]) => Promise<any>) {
  const state = reactive<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = async (...args: any[]) => {
    try {
      state.loading = true
      state.error = null
      
      const response = await apiFunction(...args)
      state.data = response.data || response
      
      return response
    } catch (error: any) {
      state.error = error.message || '请求失败'
      console.error('API请求失败:', error)
      throw error
    } finally {
      state.loading = false
    }
  }

  const reset = () => {
    state.data = null
    state.loading = false
    state.error = null
  }

  return {
    ...toRefs(state),
    execute,
    reset
  }
}

/**
 * 自动执行的API调用
 */
export function useAsyncApi<T>(
  apiFunction: (...args: any[]) => Promise<any>,
  immediate = true,
  ...args: any[]
) {
  const { data, loading, error, execute, reset } = useApi<T>(apiFunction)

  if (immediate) {
    execute(...args)
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
    refresh: () => execute(...args)
  }
}

/**
 * 分页数据API调用
 */
export function usePaginatedApi<T>(
  apiFunction: (params: any) => Promise<any>,
  initialParams: any = {}
) {
  const data = ref<T[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const pagination = reactive({
    currentPage: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })

  const params = reactive({
    ...initialParams,
    page: pagination.currentPage,
    limit: pagination.pageSize
  })

  const fetchData = async (customParams?: any) => {
    try {
      loading.value = true
      error.value = null

      const mergedParams = { ...params, ...customParams }
      const response = await apiFunction(mergedParams)
      
      if (response.data) {
        data.value = response.data.data || response.data
        if (response.data.pagination) {
          Object.assign(pagination, response.data.pagination)
        } else if (response.data.total !== undefined) {
          pagination.total = response.data.total
          pagination.totalPages = Math.ceil(pagination.total / pagination.pageSize)
        }
      }

      return response
    } catch (err: any) {
      error.value = err.message || '请求失败'
      ElMessage.error(error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  const changePage = (page: number) => {
    pagination.currentPage = page
    params.page = page
    return fetchData()
  }

  const changePageSize = (size: number) => {
    pagination.pageSize = size
    pagination.currentPage = 1
    params.limit = size
    params.page = 1
    return fetchData()
  }

  const updateParams = (newParams: any) => {
    Object.assign(params, newParams)
    pagination.currentPage = 1
    params.page = 1
    return fetchData()
  }

  const refresh = () => fetchData()

  const reset = () => {
    data.value = []
    pagination.currentPage = 1
    pagination.total = 0
    pagination.totalPages = 0
    error.value = null
  }

  return {
    data,
    loading,
    error,
    pagination,
    params,
    fetchData,
    changePage,
    changePageSize,
    updateParams,
    refresh,
    reset
  }
}

/**
 * 实时数据轮询
 */
export function usePollingApi<T>(
  apiFunction: (...args: any[]) => Promise<any>,
  interval = 5000,
  immediate = true,
  ...args: any[]
) {
  const { data, loading, error, execute } = useApi<T>(apiFunction)
  const isPolling = ref(false)
  let timer: NodeJS.Timeout | null = null

  const startPolling = () => {
    if (isPolling.value) return

    isPolling.value = true
    timer = setInterval(() => {
      execute(...args)
    }, interval)

    if (immediate) {
      execute(...args)
    }
  }

  const stopPolling = () => {
    isPolling.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const restartPolling = () => {
    stopPolling()
    startPolling()
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    data,
    loading,
    error,
    isPolling,
    execute,
    startPolling,
    stopPolling,
    restartPolling
  }
}

/**
 * 缓存API调用
 */
export function useCachedApi<T>(
  apiFunction: (...args: any[]) => Promise<any>,
  cacheKey: string,
  cacheTime = 5 * 60 * 1000 // 5分钟
) {
  const cache = new Map<string, { data: any; timestamp: number }>()
  const { data, loading, error, execute: originalExecute } = useApi<T>(apiFunction)

  const execute = async (...args: any[]) => {
    const key = `${cacheKey}_${JSON.stringify(args)}`
    const cached = cache.get(key)
    const now = Date.now()

    // 如果有缓存且未过期，直接使用缓存
    if (cached && now - cached.timestamp < cacheTime) {
      data.value = cached.data
      return cached.data
    }

    // 执行API调用
    const result = await originalExecute(...args)
    
    // 缓存结果
    cache.set(key, {
      data: result.data || result,
      timestamp: now
    })

    return result
  }

  const clearCache = (specificKey?: string) => {
    if (specificKey) {
      cache.delete(specificKey)
    } else {
      cache.clear()
    }
  }

  return {
    data,
    loading,
    error,
    execute,
    clearCache
  }
}
