import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: '/api', // Vite会自动代理到后端
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 显示加载进度条
    NProgress.start()
    
    // 可以在这里添加token等认证信息
    // const token = getToken()
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    
    return config
  },
  (error) => {
    NProgress.done()
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    NProgress.done()
    
    const { data, status } = response
    
    // 根据后端返回的数据格式处理
    if (status === 200) {
      // 如果后端返回的是标准格式 { success: boolean, data: any, message: string }
      if (data.success === false) {
        ElMessage.error(data.message || '请求失败')
        return Promise.reject(new Error(data.message || '请求失败'))
      }
      return data
    } else {
      ElMessage.error('请求失败')
      return Promise.reject(new Error('请求失败'))
    }
  },
  (error) => {
    NProgress.done()
    
    console.error('Response error:', error)
    
    // 处理不同的错误状态码
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          // 可以在这里处理登出逻辑
          break
        case 403:
          ElMessage.error('访问被拒绝')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(data?.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

export default service
