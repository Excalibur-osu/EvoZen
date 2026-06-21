<script setup lang="ts">
import { iconMap, type IconName } from './app-icons'

defineProps<{
  name: IconName
  size?: number
  strokeWidth?: number
}>()
</script>

<template>
  <component
    :is="iconMap[name]"
    :size="size ?? 16"
    :stroke-width="strokeWidth ?? 2"
    aria-hidden="true"
  />
</template>
