<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

function handleReset() {
  if (confirm('警告：这将完全清除游戏进度，而且无法撤消！\n确实要硬重置吗？')) {
    game.hardReset()
    game.toggleSettings()
  }
}

function handleExportFile() {
  const exportStr = game.getExportString()
  const blob = new Blob([exportStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `EvoZen_Save_${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const fileInputRef = ref<HTMLInputElement | null>(null)
function handleFileImport(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (re) => {
    const content = (re.target?.result as string)?.trim()
    if (!content) {
      target.value = ''
      return
    }
    
    if (confirm('导入将覆盖当前所有进度，确定要继续吗？')) {
      const success = game.doImport(content)
      if (success) {
        game.toggleSettings() // 导入成功后自动关闭弹窗
      } else {
        alert('导入失败，存档文件损坏或无效！')
      }
    }
    target.value = '' // reset input
  }
  reader.readAsText(file)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div class="settings-modal-overlay" v-if="game.isSettingsOpen" @click.self="game.toggleSettings()">
        <div class="settings-modal">
          <div class="modal-header">
            <h3 class="panel-title">⚙️ 系统设置</h3>
            <button class="close-btn" @click="game.toggleSettings()">×</button>
          </div>
          
          <div class="panel-content">
        <div class="setting-group">
          <h4>存档管理</h4>
          <p class="desc">你可以将当前进度下载为 JSON 文件安全备份，或随后从本地文件恢复进度。<br><strong class="text-warning">警告：导入操作将直接覆盖当前的全部心血！</strong></p>
          <div class="action-row">
            <button class="btn" @click="handleExportFile">💾 导出存档 (.json)</button>
            
            <input type="file" ref="fileInputRef" accept=".json" style="display: none" @change="handleFileImport" />
            <button class="btn" @click="fileInputRef?.click()">📂 导入存档</button>
          </div>
        </div>

        <div class="setting-group danger-zone">
          <h4 class="text-danger">危险区域</h4>
          <p class="desc">万劫不复之境，一切推倒重来。没有前世记忆，没有转生福利，最纯粹的毁灭。</p>
          <div class="action-row">
            <button class="btn danger" @click="handleReset">☢️ 硬重置 (彻底清除存档)</button>
          </div>
        </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.settings-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}
.close-btn:hover {
  color: #ef4444;
}

.panel-content {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-group {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 16px;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.setting-group h4 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 14px;
}
.setting-group .desc {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.setting-group .desc.warning {
  color: var(--warning);
  font-size: 12px;
  margin-top: 8px;
  margin-bottom: 0;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 13px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--border-hover);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}
.btn.danger {
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}
.btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--danger);
}

.text-warning {
  color: var(--warning);
}
.text-danger {
  color: var(--danger);
}

.danger-zone {
  border-color: rgba(239, 68, 68, 0.3);
  background: transparent;
}
.danger-zone h4 {
  color: var(--danger);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-active .settings-modal,
.modal-leave-active .settings-modal {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .settings-modal,
.modal-leave-to .settings-modal {
  transform: translateY(20px) scale(0.95);
}
</style>
