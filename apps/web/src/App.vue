<!--
  前端应用主入口容器 (App.vue)
  负责初始化调度 Pinia 状态、组织左右两侧的响应式布局分栏，并展示顶部导航栏。
  涵盖了由未开化(protoplasm)到开启文明全选项卡的流转控制。
-->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useGameStore } from './stores/game'
import GameHeader from './components/GameHeader.vue'
import EvolutionPanel from './components/EvolutionPanel.vue'
import ResourcePanel from './components/ResourcePanel.vue'
import ResourceDetailPanel from './components/ResourceDetailPanel.vue'
import BuildPanel from './components/BuildPanel.vue'
import TechPanel from './components/TechPanel.vue'
import JobPanel from './components/JobPanel.vue'
import CraftPanel from './components/CraftPanel.vue'
import TradePanel from './components/TradePanel.vue'
import GovernmentPanel from './components/GovernmentPanel.vue'
import StoragePanel from './components/StoragePanel.vue'
import PowerPanel from './components/PowerPanel.vue'
import MilitaryPanel from './components/MilitaryPanel.vue'
import MessageLog from './components/MessageLog.vue'

const game = useGameStore()
const activeTab = ref<'city' | 'civic' | 'research' | 'resources' | 'industry' | 'market' | 'storage' | 'military'>('city')
/** 市政 Tab 下的子 Tab */
const civicSubTab = ref<'jobs' | 'government' | 'military'>('jobs')

onMounted(() => {
  game.init()
})

const tabs = computed(() => {
  if (game.isEvolving) return []
  const list: Array<{ id: string; label: string; visible: boolean }> = [
    { id: 'city', label: cityTabLabel.value, visible: true },
    { id: 'civic', label: '市政', visible: game.state.settings.showCivic },
    { id: 'research', label: '研究', visible: true },
    { id: 'resources', label: '资源', visible: game.state.settings.showResources },
    { id: 'industry', label: '工坊', visible: (game.state.tech['foundry'] ?? 0) >= 1 },
    { id: 'market', label: '贸易', visible: game.state.settings.showMarket },
    { id: 'storage', label: '仓储', visible: game.state.settings.showStorage },
  ]
  return list.filter(t => t.visible)
})

/** 城市标签名根据人口动态变化（贴合原版） */
const cityTabLabel = computed(() => {
  const pop = game.population
  if (pop <= 5) return '洞穴'
  if (pop <= 20) return '村落'
  if (pop <= 75) return '小镇'
  if (pop <= 250) return '城镇'
  if (pop <= 600) return '小城'
  if (pop <= 1200) return '中城'
  if (pop <= 2500) return '大城'
  return '都会'
})
</script>

<template>
  <div class="app-container">
    <GameHeader />
    <div class="app-body">
      <!-- 进化阶段：全屏 -->
      <EvolutionPanel v-if="game.isEvolving" />

      <!-- 文明阶段：左-右两栏 -->
      <template v-else>
        <!-- 左侧栏：种族信息 + 消息日志 + 资源列表 -->
        <aside class="left-column">
          <div class="race-header card">
            <div class="card-body" style="padding: 8px 12px">
              <div class="race-name">{{ game.state.race.species === 'human' ? '人类' : game.state.race.species }}</div>
              <div class="race-meta flex items-center justify-between text-xs" style="color: var(--text-secondary)">
                <span>👥 {{ Math.floor(game.population) }}</span>
              </div>
            </div>
          </div>
          <MessageLog />
          <ResourcePanel />
        </aside>

        <!-- 右侧主区：Tab 切换内容 -->
        <main class="main-column">
          <div class="tab-bar">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-btn"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id as any"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="tab-content">
            <PowerPanel v-if="activeTab === 'city'" />
            <BuildPanel v-if="activeTab === 'city'" />
            <!-- 市政：内部分 jobs / government 子 Tab -->
            <template v-if="activeTab === 'civic'">
              <div class="subtab-bar">
                <button
                  class="subtab-btn"
                  :class="{ active: civicSubTab === 'jobs' }"
                  @click="civicSubTab = 'jobs'"
                >岗位</button>
                <button
                  v-if="(game.state.tech['govern'] ?? 0) >= 1"
                  class="subtab-btn"
                  :class="{ active: civicSubTab === 'government' }"
                  @click="civicSubTab = 'government'"
                >政府</button>
                <button
                  v-if="game.state.settings.showMil"
                  class="subtab-btn"
                  :class="{ active: civicSubTab === 'military' }"
                  @click="civicSubTab = 'military'"
                >军事</button>
              </div>
              <JobPanel v-if="civicSubTab === 'jobs'" />
              <GovernmentPanel v-if="civicSubTab === 'government'" />
              <MilitaryPanel v-if="civicSubTab === 'military'" />
            </template>
            <TechPanel v-if="activeTab === 'research'" />
            <ResourceDetailPanel v-if="activeTab === 'resources'" />
            <CraftPanel v-if="activeTab === 'industry'" />
            <TradePanel v-if="activeTab === 'market'" />
            <StoragePanel v-if="activeTab === 'storage'" />
          </div>
        </main>
      </template>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左栏：固定 280px 宽 */
.left-column {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  overflow: hidden;
}

.race-header {
  flex-shrink: 0;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--border-color);
}
.race-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 2px;
}

/* 右侧主区 */
.main-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 0 12px;
  gap: 2px;
}
.tab-btn {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  font-family: var(--font-sans);
}
.tab-btn:hover {
  color: var(--text-primary);
}
.tab-btn.active {
  color: var(--text-accent);
  border-bottom-color: var(--accent);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

/* 市政子 Tab */
.subtab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}
.subtab-btn {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.18s, border-color 0.18s;
  font-family: var(--font-sans);
  margin-bottom: -1px;
}
.subtab-btn:hover {
  color: var(--text-primary);
}
.subtab-btn.active {
  color: var(--text-accent);
  border-bottom-color: var(--accent);
}
</style>
