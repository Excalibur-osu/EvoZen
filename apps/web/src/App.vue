<!--
  前端应用主入口容器 (App.vue)
  负责初始化调度 Pinia 状态、组织左右两侧的响应式布局分栏，并展示顶部导航栏。
  涵盖了由未开化(protoplasm)到开启文明全选项卡的流转控制。
-->
<script setup lang="ts">
import { onMounted, ref, computed, watch, onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import GameHeader from './components/GameHeader.vue'
import EvolutionPanel from './components/EvolutionPanel.vue'
import ResourcePanel from './components/ResourcePanel.vue'
import BuildPanel from './components/BuildPanel.vue'
import TechPanel from './components/TechPanel.vue'
import JobPanel from './components/JobPanel.vue'
import CraftPanel from './components/CraftPanel.vue'
import TradePanel from './components/TradePanel.vue'
import GovernmentPanel from './components/GovernmentPanel.vue'
import StoragePanel from './components/StoragePanel.vue'
import PowerPanel from './components/PowerPanel.vue'
import MilitaryPanel from './components/MilitaryPanel.vue'
import ArpaPanel from './components/ArpaPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import MessageLog from './components/MessageLog.vue'
import MobileNotSupported from './components/MobileNotSupported.vue'


const game = useGameStore()
const activeTab = ref<'evolution' | 'city' | 'civic' | 'arpa' | 'resources' | 'industry' | 'market' | 'storage'>('evolution')
/** 市政 Tab 下的子 Tab */
const civicSubTab = ref<'jobs' | 'government' | 'military'>('jobs')

/** 种族名称中文映射 */
const SPECIES_LABELS: Record<string, string> = {
  human:   '人类',
  elven:   '精灵',
  orc:     '兽人',
  dwarf:   '矮人',
  goblin:  '地精',
}

/** 当前人口上限 */
const popMax = computed(() => {
  const species = game.state.race.species
  return game.state.resource[species]?.max ?? 0
})

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  game.init()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(() => game.isEvolving, (isEvolving) => {
  if (isEvolving) {
    activeTab.value = 'evolution'
  } else if (activeTab.value === 'evolution') {
    activeTab.value = 'city'
  }
}, { immediate: true })

const tabs = computed(() => {
  const list: Array<{ id: string; label: string; visible: boolean }> = []
  if (game.isEvolving) {
    list.push({ id: 'evolution', label: '🧬 进化', visible: true })
  } else {
    list.push(
      { id: 'city', label: cityTabLabel.value, visible: true },
      { id: 'civic', label: '市政', visible: game.state.settings.showCivic },
      { id: 'arpa', label: 'ARPA', visible: (game.state.tech['monument'] ?? 0) >= 1 },
      { id: 'industry', label: '工坊', visible: (game.state.tech['foundry'] ?? 0) >= 1 },
      { id: 'market', label: '贸易', visible: game.state.settings.showMarket },
      { id: 'storage', label: '仓储', visible: game.state.settings.showStorage }
    )
  }
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
  <MobileNotSupported v-if="isMobile" />
  <div v-else class="app-container">
    <GameHeader />
    <div class="app-body">
      <!-- 统一布局：3栏结构 (左：资源，中：主玩法，右：历史日志) -->
      <!-- 左侧栏：种族信息 + 资源列表 -->
      <aside class="left-column" v-if="!game.isEvolving">
        <div class="race-header card">
          <div class="card-body" style="padding: 8px 10px">
            <div class="race-name">{{ SPECIES_LABELS[game.state.race.species] ?? game.state.race.species }}</div>
            <div class="race-pop-row" v-if="popMax > 0">
              <span class="pop-label">👥 人口</span>
              <span class="pop-value font-mono">{{ Math.floor(game.population) }} / {{ popMax }}</span>
            </div>
          </div>
        </div>
        <ResourcePanel />
      </aside>

      <!-- 中间主区：Tab 切换内容 -->
      <main class="main-column">
        <div class="tab-bar" v-if="!game.isEvolving">
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
        <div class="tab-content" id="scrollable-content">
          <EvolutionPanel v-if="activeTab === 'evolution'" />
          
          <template v-else>
            <PowerPanel v-if="activeTab === 'city'" />
            <BuildPanel v-if="activeTab === 'city'" />
            <TechPanel v-if="activeTab === 'city'" />
            <!-- 市政：内部分 jobs / government / military 子 Tab -->
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
            <ArpaPanel v-if="activeTab === 'arpa'" />
            <CraftPanel v-if="activeTab === 'industry'" />
            <TradePanel v-if="activeTab === 'market'" />
            <StoragePanel v-if="activeTab === 'storage'" />
          </template>
        </div>
      </main>

      <!-- 右侧栏：独立的历史消息日志区 -->
      <aside class="right-column">
        <MessageLog />
      </aside>
    </div>

    <!-- 弹窗组件挂载区 -->
    <SettingsPanel />

    <!-- 暂停全屏遮罩 -->
    <div v-if="game.isPaused" class="pause-overlay" @click="game.togglePause()">
      <div class="pause-content">
        <h2>⏸ 游戏已暂停</h2>
        <p>点击任意处恢复运行</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary); /* Use deep background */
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左栏：稍微变窄一点以节省空间，更加紧凑 */
.left-column {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  overflow: hidden;
}

/* 右栏：历史日志栏 */
.right-column {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  background: var(--bg-secondary);
  overflow: hidden;
}

.race-header {
  flex-shrink: 0;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.015);
}
.race-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.race-pop-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.pop-label {
  font-size: 11px;
  color: var(--text-secondary);
}
.pop-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
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
  padding: 0 10px;
  gap: 2px;
}
.tab-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-sans);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tab-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.02);
}
.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  text-shadow: 0 0 8px var(--accent-glow);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px; /* Reduced paddings */
}

/* 市政子 Tab */
.subtab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}
.subtab-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-sans);
  margin-bottom: -1px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.subtab-btn:hover {
  color: var(--text-primary);
}
.subtab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  text-shadow: 0 0 6px var(--accent-glow);
}

/* 暂停遮罩 */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px) grayscale(50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: fadeIn 0.3s ease;
}
.pause-content {
  text-align: center;
  color: var(--text-primary);
  background: rgba(255,255,255,0.02);
  padding: 40px 80px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.02);
}
.pause-content h2 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: 4px;
  background: -webkit-linear-gradient(45deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(167, 139, 250, 0.4);
}
.pause-content p {
  font-size: 15px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}
</style>
