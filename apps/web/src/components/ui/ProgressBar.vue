<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'rna' | 'dna'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>(), {
  tone: 'accent',
  size: 'xs',
})

const normalizedValue = computed(() => Math.max(0, Math.min(100, props.value)))
</script>

<template>
  <div class="ui-progress" :class="[`tone-${tone}`, `size-${size}`]" role="progressbar" :aria-valuenow="normalizedValue" aria-valuemin="0" aria-valuemax="100">
    <div class="ui-progress-fill" :style="{ width: `${normalizedValue}%` }" />
  </div>
</template>
