<!--
  底部系统消息日志台 (MessageLog.vue)
  负责展示系统事件信息（比如进化提示、科技解锁、市民饥饿/死亡等重要进展）
  当存在新消息时自动将内部滚动条滚到最底部。
-->
<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const logContainer = ref<any>(null)

const recentMessages = computed(() => {
  return game.messages.slice(-80)
})

watch(() => game.messages.length, async () => {
  await nextTick()
  if (logContainer.value) {
    const el = logContainer.value.$el || logContainer.value
    el.scrollTop = el.scrollHeight
  }
})

function msgClass(type: string): string {
  switch (type) {
    case 'success': return 'msg-success'
    case 'danger': return 'msg-danger'
    case 'warning': return 'msg-warning'
    case 'special': return 'msg-special'
    default: return 'msg-info'
  }
}
</script>

<template>
  <div class="message-log-section">
    <div class="log-header">
      <span class="log-title">📜 消息日志</span>
      <button class="clear-btn" @click="game.clearMessages()" title="清空日志">🗑️</button>
    </div>
    <TransitionGroup name="list" tag="div" class="log-list" ref="logContainer">
      <p
        v-for="(msg, i) in recentMessages"
        :key="i"
        class="log-item"
        :class="msgClass(msg.type)"
      >
        <span class="log-time" v-if="msg.timestamp">[{{ msg.timestamp }}]</span>
        <span class="log-text">{{ msg.text }}</span>
      </p>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.message-log-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(255,255,255,0.02);
}
.clear-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.5;
  transition: all 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.clear-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}
.log-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px 8px;
}
.log-item {
  font-size: 11px;
  padding: 1px 0;
  line-height: 1.4;
  color: var(--text-secondary);
}
.msg-success { color: var(--success); }
.msg-danger { color: var(--danger); }
.msg-warning { color: var(--warning); }
.msg-special { color: #a78bfa; font-weight: 600; }
.msg-info { color: var(--text-secondary); }
.log-time {
  color: var(--text-muted);
  opacity: 0.8;
  margin-right: 6px;
  font-family: var(--font-mono);
  font-size: 0.95em;
}

/* 列表过渡动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
