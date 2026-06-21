<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { iconMap, type IconName } from './app-icons'

const props = defineProps<{
  title: string
  subtitle?: string
  icon?: IconName | string
}>()

const iconName = computed(() => {
  return props.icon && props.icon in iconMap ? props.icon as IconName : null
})
</script>

<template>
  <header class="ui-panel-header">
    <div class="ui-panel-title-row">
      <span v-if="icon" class="ui-panel-icon" aria-hidden="true">
        <AppIcon v-if="iconName" :name="iconName" />
        <span v-else>{{ icon }}</span>
      </span>
      <h2 class="ui-panel-title">{{ title }}</h2>
    </div>
    <p v-if="subtitle" class="ui-panel-subtitle">{{ subtitle }}</p>
  </header>
</template>
