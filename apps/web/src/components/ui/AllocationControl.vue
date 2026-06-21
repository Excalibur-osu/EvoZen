<script setup lang="ts">
import StepperButton from './StepperButton.vue'

withDefaults(defineProps<{
  value: number
  decrementLabel?: string
  incrementLabel?: string
  decrementDisabled?: boolean
  incrementDisabled?: boolean
}>(), {
  decrementLabel: '减少分配',
  incrementLabel: '增加分配',
  decrementDisabled: false,
  incrementDisabled: false,
})

const emit = defineEmits<{
  decrement: []
  increment: []
}>()
</script>

<template>
  <div class="ui-allocation-control">
    <StepperButton
      label="−"
      :aria-label="decrementLabel"
      :disabled="decrementDisabled"
      @click="emit('decrement')"
    />
    <span class="ui-allocation-value">{{ value }}</span>
    <StepperButton
      label="+"
      :aria-label="incrementLabel"
      :disabled="incrementDisabled"
      @click="emit('increment')"
    />
  </div>
</template>
