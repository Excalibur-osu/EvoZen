<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'accent' | 'warning' | 'danger'
}>(), {
  sub: undefined,
  tone: 'default',
})
</script>

<template>
  <div class="ui-metric-card" :class="`tone-${tone}`">
    <span class="ui-metric-label">{{ label }}</span>
    <span class="ui-metric-value">{{ value }}</span>
    <span v-if="sub" class="ui-metric-sub">{{ sub }}</span>
  </div>
</template>
