<script setup lang="ts" generic="T extends string">
defineProps<{
  items: Array<{ id: T; label: string; count?: number }>
  active: T
}>()

const emit = defineEmits<{
  select: [id: T]
}>()
</script>

<template>
  <div class="ui-segmented-tabs" role="tablist">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="ui-segment"
      :class="{ active: active === item.id }"
      role="tab"
      :aria-selected="active === item.id"
      @click="emit('select', item.id)"
    >
      <span>{{ item.label }}</span>
      <span v-if="item.count !== undefined" class="ui-segment-count">{{ item.count }}</span>
    </button>
  </div>
</template>

