<script setup lang="ts">
// 移动端提示页面组件
</script>

<template>
  <div class="mobile-not-supported">
    <div class="glass-panel">
      <div class="icon-container">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="pc-icon">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      </div>
      <h1 class="title">终端视野受限</h1>
      <p class="description">
        移动端屏幕无法承载 EvoZen 庞大的进化数据与管理系统。<br><br>
        请<strong>使用电脑浏览器</strong>重新建立连接，以获得完整的文明演化体验。
      </p>
      <div class="glow-divider"></div>
      <p class="tip">期待在更广阔的屏幕上与您重逢。</p>
    </div>
  </div>
</template>

<style scoped>
.mobile-not-supported {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.glass-panel {
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 40px 24px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.icon-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.2);
  margin-bottom: 24px;
  box-shadow: 0 0 30px rgba(34, 197, 94, 0.1);
  animation: float 6s ease-in-out infinite;
}

.pc-icon {
  color: var(--accent);
  filter: drop-shadow(0 0 8px var(--accent-glow));
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.description strong {
  color: var(--accent);
  font-weight: 600;
}

.glow-divider {
  height: 1px;
  width: 60%;
  margin: 0 auto 24px;
  background: linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.3), transparent);
}

.tip {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>
