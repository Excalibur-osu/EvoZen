<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  text?: string
  position?: 'top' | 'bottom' | 'right'
  tag?: 'span' | 'div'
}>(), {
  text: undefined,
  position: 'top',
  tag: 'span',
})

const anchorRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const coords = ref({ top: 0, left: 0 })

const hasText = computed(() => Boolean(props.text?.trim()))
const tooltipStyle = computed(() => ({
  top: `${coords.value.top}px`,
  left: `${coords.value.left}px`,
}))

function updatePosition() {
  const anchor = anchorRef.value
  if (!anchor || !hasText.value) return

  const rect = anchor.getBoundingClientRect()
  const gap = 8

  if (props.position === 'right') {
    coords.value = {
      top: rect.top + rect.height / 2,
      left: rect.right + gap,
    }
    return
  }

  if (props.position === 'bottom') {
    coords.value = {
      top: rect.bottom + gap,
      left: rect.left + rect.width / 2,
    }
    return
  }

  coords.value = {
    top: rect.top - gap,
    left: rect.left + rect.width / 2,
  }
}

async function show() {
  if (!hasText.value) return
  visible.value = true
  await nextTick()
  updatePosition()
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
}

function hide() {
  visible.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

onBeforeUnmount(hide)
</script>

<template>
  <component
    :is="tag"
    ref="anchorRef"
    v-bind="$attrs"
    :class="['ui-tooltip-anchor', { 'has-tooltip': hasText }]"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </component>

  <Teleport to="body">
    <div
      v-if="visible && hasText"
      :class="['ui-tooltip-floating', `pos-${position}`]"
      :style="tooltipStyle"
      role="tooltip"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<style scoped>
.ui-tooltip-anchor.has-tooltip {
  cursor: help;
}

.ui-tooltip-floating {
  position: fixed;
  z-index: var(--z-tooltip);
  max-width: min(360px, 80vw);
  width: max-content;
  padding: 5px 10px;
  border: 1px solid #475569;
  border-radius: 4px;
  background: #0f172a;
  color: #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(71, 85, 105, 0.3);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.45;
  letter-spacing: normal;
  white-space: pre-line;
  pointer-events: none;
}

.ui-tooltip-floating.pos-top {
  transform: translate(-50%, -100%);
}

.ui-tooltip-floating.pos-bottom {
  transform: translate(-50%, 0);
}

.ui-tooltip-floating.pos-right {
  transform: translate(0, -50%);
}
</style>
