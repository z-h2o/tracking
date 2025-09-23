<template>
  <div class="error-404">
    <el-result
      icon="error"
      title="404"
      sub-title="抱歉，页面不存在"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
// 404页面
</script>

<style lang="scss" scoped>
.error-404 {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
