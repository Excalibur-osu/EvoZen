<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { iconMap, type IconName } from './app-icons'

const props = defineProps<{
  text: string
  icon?: IconName | string
}>()

const iconName = computed(() => {
  return props.icon && props.icon in iconMap ? props.icon as IconName : null
})
</script>

<template>
  <div class="ui-empty-state">
    <span v-if="icon" class="ui-empty-icon" aria-hidden="true">
      <AppIcon v-if="iconName" :name="iconName" />
      <span v-else>{{ icon }}</span>
    </span>
    <span>{{ text }}</span>
  </div>
</template>
