<script setup lang="ts">
// 移动端提示页面组件
import AppIcon from './ui/AppIcon.vue'
</script>

<template>
  <div class="mobile-not-supported">
    <div class="glass-panel">
      <div class="icon-container">
        <AppIcon name="matrixReset" class="pc-icon" :size="64" :stroke-width="1.5" />
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
  z-index: var(--z-modal);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.glass-panel {
  background: color-mix(in srgb, var(--bg-card) 68%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 40px 24px;
  max-width: 400px;
  text-align: center;
  box-shadow:
    0 20px 40px color-mix(in srgb, var(--bg-primary) 70%, transparent),
    inset 0 0 0 1px var(--surface-raised);
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.icon-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--accent-glow);
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  margin-bottom: 24px;
  box-shadow: 0 0 30px var(--accent-glow);
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
  background: linear-gradient(90deg, transparent, var(--accent-glow), transparent);
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
