<template>
  <div class="container" ref="container">
    <h1>埋点SDK使用示例</h1>
    
    <h2>点击追踪</h2>
    <button class="button login_button" data-spm="home.button.login" data-track-page="home">
        登录按钮
    </button>
    
    <button class="button register_button" data-spm="home.button.register" data-track-custom="premium">
        注册按钮
    </button>
    
    <h2>曝光追踪</h2>
    <div class="view-element main_banner" data-spm="home.banner.main" data-track-trigger="view">
        主要横幅（会自动追踪曝光）
    </div>
    
    <div class="view-element" data-spm="home.banner.secondary" data-track-trigger="view" data-track-delay="1000">
        延迟横幅（1秒后追踪）
    </div>
    
    <h2>手动追踪</h2>
    <button @click="manualTrack">手动发送追踪事件</button>
    <button @click="triggerError">触发测试错误</button>
    <button @click="testViewTracking">测试曝光追踪</button>
    
</div>
</template>

<script setup lang="ts">
const container = ref<HTMLDivElement | null>(null);

const manualTrack = () => {
  window.tracker.sendTrack({
    user_id: Math.random().toString(36).substring(2, 15),
    action: 'manual_test',
    value: Math.floor(Math.random() * 100)
  });
};
const triggerError = () => {
  // 触发JavaScript错误进行测试
  setTimeout(() => {
      throw new Error('这是一个测试错误');
  }, 500);
  
  // 触发Promise rejection错误
  Promise.reject(new Error('Promise rejection 测试错误'));
};
const testViewTracking = () => {
  // 动态创建一个曝光追踪元素
  const testDiv = document.createElement('div');
  testDiv.className = 'view-element';
  testDiv.setAttribute('data-spm', 'test.dynamic.element');
  testDiv.setAttribute('data-track-trigger', 'view');
  testDiv.textContent = '动态创建的曝光追踪元素';
  testDiv.style.marginTop = '20px';
  testDiv.style.height = '100px';
  testDiv.style.backgroundColor = '#ffeb3b';
  testDiv.style.border = '2px solid #f57f17';
  testDiv.style.display = 'flex';
  testDiv.style.alignItems = 'center';
  testDiv.style.justifyContent = 'center';
  
  // 添加到页面
  container.value?.appendChild(testDiv);
  
  console.log('已添加动态曝光追踪元素，请查看控制台输出');
};
</script>

<style scoped>
.debug-enabled {
  outline: 2px solid #ff0000 !important;
  background-color: rgba(255, 0, 0, 0.1) !important;
}
.container {
  height: 100vh;
  overflow: auto;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.button {
  display: inline-block;
  padding: 10px 20px;
  margin: 10px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  cursor: pointer;
}
.view-element {
  height: 100px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}
</style>