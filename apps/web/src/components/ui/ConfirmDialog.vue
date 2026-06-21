<script setup lang="ts">
import { useConfirmDialog } from '../../utils/confirm-dialog'

const { state, resolve } = useConfirmDialog()
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-dialog">
      <div v-if="state.open" class="ui-dialog-overlay" @click.self="resolve(false)">
        <section class="ui-dialog" role="dialog" aria-modal="true" :aria-labelledby="'confirm-dialog-title'">
          <header class="ui-dialog-header">
            <h3 id="confirm-dialog-title">{{ state.title }}</h3>
          </header>
          <p class="ui-dialog-message">{{ state.message }}</p>
          <footer class="ui-dialog-actions">
            <button class="btn" type="button" @click="resolve(false)">
              {{ state.cancelLabel }}
            </button>
            <button
              class="btn"
              :class="state.tone === 'danger' ? 'danger' : 'primary'"
              type="button"
              @click="resolve(true)"
            >
              {{ state.confirmLabel }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, var(--bg-primary) 76%, transparent);
  backdrop-filter: blur(5px);
}

.ui-dialog {
  width: min(420px, 100%);
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  box-shadow: 0 16px 36px color-mix(in srgb, var(--bg-primary) 68%, transparent);
}

.ui-dialog-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}

.ui-dialog-message {
  margin: 10px 0 16px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-line;
}

.ui-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ui-dialog-enter-active,
.ui-dialog-leave-active {
  transition: opacity 0.18s ease;
}
.ui-dialog-enter-active .ui-dialog,
.ui-dialog-leave-active .ui-dialog {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.ui-dialog-enter-from,
.ui-dialog-leave-to {
  opacity: 0;
}
.ui-dialog-enter-from .ui-dialog,
.ui-dialog-leave-to .ui-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
