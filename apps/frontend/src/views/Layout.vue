<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <el-icon v-if="isCollapse" size="24" color="#409eff">
          <TrendCharts />
        </el-icon>
        <span v-else class="logo-text">埋点监控</span>
      </div>
      
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        :collapse="isCollapse"
        :unique-opened="true"
        router
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <!-- 有子菜单的项 -->
          <el-sub-menu v-if="route.children && route.children.length > 0" :index="route.path">
            <template #title>
              <el-icon>
                <component :is="route.meta?.icon" />
              </el-icon>
              <span>{{ route.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in route.children"
              :key="child.path"
              :index="child.path"
            >
              <el-icon>
                <component :is="child.meta?.icon" />
              </el-icon>
              <span>{{ child.meta?.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          
          <!-- 单级菜单项 -->
          <el-menu-item v-else :index="route.path">
            <el-icon>
              <component :is="route.meta?.icon" />
            </el-icon>
            <span>{{ route.meta?.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-button
            text
            @click="toggleCollapse"
            class="collapse-btn"
          >
            <el-icon size="18">
              <Expand v-if="isCollapse" />
              <Fold v-else />
            </el-icon>
          </el-button>
          
          <!-- 面包屑 -->
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta?.title">
              {{ currentRoute.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <!-- 实时状态 -->
          <div class="status-indicator">
            <el-badge :is-dot="isOnline" :type="isOnline ? 'success' : 'danger'">
              <span class="status-text">{{ isOnline ? '在线' : '离线' }}</span>
            </el-badge>
          </div>
          
          <!-- 用户菜单 -->
          <el-dropdown>
            <span class="user-info">
              <el-avatar size="small" :src="userAvatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">{{ username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleSettings">
                  <el-icon><Setting /></el-icon>
                  设置
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { healthApi } from '@/services/api'

const route = useRoute()
const router = useRouter()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 在线状态（这里可以连接WebSocket或定时检查）
const isOnline = ref(true)

// 用户信息
const username = ref('管理员')
const userAvatar = ref('')

// 当前路由
const currentRoute = computed(() => route)

// 获取菜单路由（排除隐藏的路由）
const menuRoutes = computed(() => {
  const routes = router.getRoutes()
  const layoutRoute = routes.find(r => r.path === '/')
  if (layoutRoute?.children) {
    return layoutRoute.children.filter(child => !child.meta?.hideInMenu)
  }
  return []
})

// 切换侧边栏折叠状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

// 处理设置
const handleSettings = () => {
  router.push('/settings')
}

// 处理退出登录
const handleLogout = () => {
  ElMessage.success('已退出登录')
  // 这里可以添加登出逻辑
  router.push('/login')
}

// 检查在线状态
const checkOnlineStatus = async () => {
  try {
    const response = await healthApi.getHealthStatus()
    isOnline.value = response.data?.status === 'ok'
  } catch (error) {
    isOnline.value = false
  }
}

// 定时检查在线状态
onMounted(() => {
  checkOnlineStatus()
  setInterval(checkOnlineStatus, 30000) // 每30秒检查一次
})
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background: #001529;
  transition: width 0.2s;
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #002140;
    
    .logo-text {
      color: #fff;
      font-size: 18px;
      font-weight: bold;
    }
  }
  
  .sidebar-menu {
    height: calc(100vh - 60px);
    border-right: none;
    background: #001529;
    
    :deep(.el-menu-item) {
      color: rgba(255, 255, 255, 0.65);
      
      &:hover {
        background: #1890ff !important;
        color: #fff;
      }
      
      &.is-active {
        background: #1890ff !important;
        color: #fff;
      }
    }
    
    :deep(.el-sub-menu__title) {
      color: rgba(255, 255, 255, 0.65);
      
      &:hover {
        background: #1890ff !important;
        color: #fff;
      }
    }
    
    :deep(.el-sub-menu) {
      .el-menu-item {
        background: #000c17 !important;
        
        &:hover {
          background: #1890ff !important;
        }
        
        &.is-active {
          background: #1890ff !important;
        }
      }
    }
  }
}

.header {
  background: #fff;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .header-left {
    display: flex;
    align-items: center;
    
    .collapse-btn {
      margin-right: 20px;
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
    
    .status-indicator {
      .status-text {
        font-size: 12px;
        color: #666;
      }
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      .username {
        font-size: 14px;
        color: #333;
      }
    }
  }
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow: auto;
}

// 页面切换动画
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
