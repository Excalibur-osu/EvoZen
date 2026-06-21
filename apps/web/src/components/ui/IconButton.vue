<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './app-icons'

withDefaults(defineProps<{
  icon: IconName
  label: string
  title?: string
  tone?: 'default' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
}>(), {
  title: undefined,
  tone: 'default',
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    class="ui-icon-button"
    :class="[`tone-${tone}`, `size-${size}`]"
    :title="title ?? label"
    :aria-label="label"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <AppIcon :name="icon" />
  </button>
</template>
