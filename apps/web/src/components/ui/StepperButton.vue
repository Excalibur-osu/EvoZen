<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  ariaLabel?: string
  title?: string
  tone?: 'default' | 'success' | 'danger' | 'accent'
  size?: 'sm' | 'md'
  shape?: 'square' | 'circle'
  disabled?: boolean
}>(), {
  ariaLabel: undefined,
  title: undefined,
  tone: 'default',
  size: 'sm',
  shape: 'square',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    class="ui-stepper-button"
    :class="[`tone-${tone}`, `size-${size}`, `shape-${shape}`]"
    :title="title"
    :aria-label="ariaLabel ?? label"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    {{ label }}
  </button>
</template>
