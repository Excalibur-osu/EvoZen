/**
 * Pinia 游戏状态 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameMessage } from '@evozen/shared-types'
import {
  createNewGame,
  saveGame,
  loadGame,
  exportSave,
  importSave,
  getBuildCost as coreGetBuildCost,
  canBuildStructure as coreCanBuildStructure,
  buildStructure as coreBuildStructure,
  enqueueStructure as coreEnqueueStructure,
  dequeueStructure as coreDequeueStructure,
  isTechAvailable as coreIsTechAvailable,
  getResearchCost as coreGetResearchCost,
  canResearchTech as coreCanResearchTech,
  researchTech as coreResearchTech,
  assignWorker as coreAssignWorker,
  removeWorker as coreRemoveWorker,
  setTaxRate as coreSetTaxRate,
  BASIC_STRUCTURES,
  BASIC_TECHS,
  manualCraft,
  assignCraftsman as coreAssignCraftsman,
  removeCraftsman as coreRemoveCraftsman,
  type CraftableId,
  buyResource as coreBuyResource,
  sellResource as coreSellResource,
  getBuyPrice as coreGetBuyPrice,
  getSellPrice as coreGetSellPrice,
  getManualTradeLimit,
  getTradeRouteQtyLimit,
  setTradeRoute as coreSetTradeRoute,
  type TradeRoute,
  changeGovernment as coreChangeGovernment,
  getMaxTaxRate,
  GOVERNMENT_DEFS,
  type GovernmentType,
  canEnqueue as coreCanEnqueue,
  isQueueUnlocked as coreIsQueueUnlocked,
  toggleQueueMode as coreToggleQueueMode,
  getQueueMax,
  buildCrate as coreBuildCrate,
  buildContainer as coreBuildContainer,
  assignCrate as coreAssignCrate,
  unassignCrate as coreUnassignCrate,
  assignContainer as coreAssignContainer,
  unassignContainer as coreUnassignContainer,
  getCrateValue,
  STORABLE_RESOURCES,
  CRATE_VALUE,
  CONTAINER_VALUE,
  CRATE_COST_PLYWOOD,
  CONTAINER_COST_STEEL,
  assignSpeciesTraits,
  getSpeciesTraitDescriptors,
  runSimulationTick,
  // 军事系统
  mercCost as coreMercCost,
  hireMerc as coreHireMerc,
  warCampaign as coreWarCampaign,
  armyRating as coreArmyRating,
  garrisonSize as coreGarrisonSize,
  TACTIC_NAMES,
  // 进化系统
  purchaseEvoUpgrade as corePurchaseEvoUpgrade,
  advanceEvoStep as coreAdvanceEvoStep,
  evolveSentience as coreEvolveSentience,
  getAvailableUpgrades,
  getAvailableSteps,
  getAvailableRaces,
  getUpgradeCount,
  getUpgradeCost,
  PLANET_TRAITS,
  // ARPA 系统
  startArpaProject as coreStartArpa,
  stopArpaProject as coreStopArpa,
  setMonumentType as coreSetMonumentType,
  arpaCost,
  getArpaProjectState,
  getMonumentType,
  getAvailableArpaProjects,
  isArpaAvailable,
  ARPA_PROJECTS,
  MONUMENT_NAMES,
  type MonumentType,
} from '@evozen/game-core'

export const useGameStore = defineStore('game', () => {
  // ---- 核心状态 ----
  const state = ref<GameState>(createNewGame())
  const messages = ref<GameMessage[]>([])
  const tickInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const tickSpeed = ref(250) // ms per tick
  const isPaused = ref(false)
  const ticksSinceLastSave = ref(0)
  const lastSaveTime = ref(0)
  const isSettingsOpen = ref(false)

  // ---- 计算属性 ----
  const isEvolving = computed(() => state.value.race.species === 'protoplasm')
  const population = computed(() => {
    const species = state.value.race.species
    return state.value.resource[species]?.amount ?? 0
  })
  const year = computed(() => state.value.city.calendar?.year ?? 0)
  const day = computed(() => state.value.city.calendar?.day ?? 0)
  const season = computed(() => {
    const s = state.value.city.calendar?.season ?? 0
    return ['春', '夏', '秋', '冬'][s] ?? '春'
  })
  const morale = computed(() => state.value.city.morale?.current ?? 100)
  const moraleCap = computed(() => state.value.city.morale?.cap ?? 125)
  const globalMultiplier = computed(() => {
    const m = morale.value
    if (m < 100) return +(m / 100).toFixed(2)
    return +(1 + (m - 100) / 200).toFixed(2)
  })
  const weatherLabel = computed(() => {
    const w = state.value.city.calendar?.weather ?? 2
    const t = state.value.city.calendar?.temp ?? 1
    const wind = state.value.city.calendar?.wind ?? 0
    const weatherNames = ['🌧️ 雨', '☁️ 多云', '☀️ 晴']
    let label = weatherNames[w] ?? '☀️ 晴'
    if (w === 0 && t > 0 && wind === 1) label = '⛈️ 雷暴'
    return label
  })

  // ---- 方法 ----

  /** 初始化游戏：尝试读档，否则新建 */
  function init() {
    const saved = loadGame()
    if (saved) {
      state.value = saved
      syncRaceTraits()
      try {
        const savedMsgs = localStorage.getItem('evozen_recent_messages')
        if (savedMsgs) messages.value = JSON.parse(savedMsgs)
      } catch (e) {
        /* ignore parser error */
      }
      addMessage('读取存档成功。', 'success', 'progress')
    } else {
      state.value = createNewGame()
      addMessage('欢迎来到 EvoZen！你是原始软泥中的原生质。', 'info', 'progress')
    }
    startLoop()
  }

  /** 启动游戏循环 */
  function startLoop() {
    if (tickInterval.value) clearInterval(tickInterval.value)
    tickInterval.value = setInterval(() => {
      if (!isPaused.value) {
        doTick()
      }
    }, tickSpeed.value)
  }

  /** 执行一个 tick */
  function doTick() {
    const tickOutput = runSimulationTick(state.value)
    state.value = tickOutput.state
    const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    let hasNew = false
    for (const msg of tickOutput.result.messages) {
      if (!msg.timestamp) msg.timestamp = ts
      messages.value.push(msg)
      hasNew = true
    }
    if (hasNew && messages.value.length > 200) {
      messages.value = messages.value.slice(-100)
    }
    if (hasNew) persistMessages()

    // 自动存档（真实世界的 tick，大约每 2000 tick = 500秒 = 8分钟，与原版一致保证稳健性）
    ticksSinceLastSave.value++
    if (ticksSinceLastSave.value >= 2000) {
      save()
      ticksSinceLastSave.value = 0
    }
  }

  function syncRaceTraits() {
    assignSpeciesTraits(state.value.race, state.value.race.species)
  }

  function getTechCost(techId: string): Record<string, number> {
    return coreGetResearchCost(state.value, techId)
  }

  /** 暂停/恢复 */
  function togglePause() {
    isPaused.value = !isPaused.value
  }

  /** 打开/关闭设置页 */
  function toggleSettings() {
    isSettingsOpen.value = !isSettingsOpen.value
  }

  /** 手动/自动存档 */
  function save() {
    const ok = saveGame(state.value)
    if (ok) {
      lastSaveTime.value = Date.now()
    } else {
      addMessage('存档遇到问题，进度未保存。', 'danger', 'progress')
    }
  }

  /** 硬重置游戏 */
  function hardReset() {
    state.value = createNewGame()
    saveGame(state.value)
    messages.value = []
    addMessage('游戏已硬重置，所有进度被清空。', 'warning', 'progress')
  }

  /** 导出存档 */
  function getExportString(): string {
    return exportSave(state.value)
  }

  /** 导入存档 */
  function doImport(encoded: string): boolean {
    const loaded = importSave(encoded)
    if (loaded) {
      state.value = loaded
      addMessage('导入存档成功！', 'success', 'progress')
      return true
    }
    addMessage('导入存档失败，数据无效。', 'danger', 'progress')
    return false
  }

  /** 添加消息 */
  function addMessage(text: string, type: GameMessage['type'] = 'info', category = 'progress') {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    messages.value.push({ text, type, category, timestamp })
    if (messages.value.length > 200) {
      messages.value = messages.value.slice(-100)
    }
    persistMessages()
  }

  /** 同步消息到 localStorage */
  function persistMessages() {
    try {
      localStorage.setItem('evozen_recent_messages', JSON.stringify(messages.value))
    } catch (e) {
      /* ignore storage quota space out errors */
    }
  }

  /** 清空消息 */
  function clearMessages() {
    messages.value = []
    persistMessages()
  }

  // ---- 建筑操作 ----

  /** 检查是否能购买建筑 */
  function canAfford(structureId: string): boolean {
    return coreCanBuildStructure(state.value, structureId)
  }

  /** 获取建筑费用 */
  function getBuildCost(structureId: string): Record<string, number> {
    return coreGetBuildCost(state.value, structureId)
  }

  /** 建造建筑 */
  function build(structureId: string) {
    const def = BASIC_STRUCTURES.find(s => s.id === structureId)
    if (!def) return
    const result = coreBuildStructure(state.value, structureId)
    if (!result) return
    state.value = result
    addMessage(`${def.name}已竣工。`, 'success', 'progress')
  }

  // ---- 建筑队列操作 ----

  const isQueueUnlocked = computed(() => coreIsQueueUnlocked(state.value))
  const queueMax = computed(() => getQueueMax(state.value))
  const canEnqueueBuilding = computed(() => coreCanEnqueue(state.value))

  function enqueueBuilding(structureId: string) {
    const def = BASIC_STRUCTURES.find(s => s.id === structureId)
    if (!def) return
    const result = coreEnqueueStructure(state.value, structureId)
    if (!result) return
    state.value = result
    addMessage(`已将 ${def.name} 加入建造队列。`, 'info', 'progress')
  }

  function dequeueBuilding(index: number) {
    const result = coreDequeueStructure(state.value, index)
    if (result) {
      state.value = result
    }
  }

  function toggleQueue() {
    coreToggleQueueMode(state.value)
  }

  // ---- 科技操作 ----

  /** 检查科技是否可见可研究 */
  function isTechAvailable(techId: string): boolean {
    return coreIsTechAvailable(state.value, techId)
  }

  function canAffordTech(techId: string): boolean {
    return coreCanResearchTech(state.value, techId)
  }

  function research(techId: string) {
    const def = BASIC_TECHS.find(t => t.id === techId)
    if (!def) return
    const result = coreResearchTech(state.value, techId)
    if (!result) return
    state.value = result
    addMessage(`🔬 ${def.name} 研发完成！`, 'special', 'progress')
  }

  // ---- 岗位操作 ----

  function assignWorker(jobId: string) {
    const result = coreAssignWorker(state.value, jobId)
    if (result) {
      state.value = result
    }
  }

  function removeWorker(jobId: string) {
    const result = coreRemoveWorker(state.value, jobId)
    if (result) {
      state.value = result
    }
  }

  // ---- 进化阶段操作 ----

  /** 手动收集 RNA（legacy: evolution-rna action，+1/tick，RNA 未满时可点击） */
  function gatherRNA() {
    const rna = state.value.resource['RNA']
    if (rna && rna.amount < rna.max) {
      rna.amount = Math.min(rna.max, rna.amount + 1)
    }
  }

  /** 手动合成 DNA（legacy: evolution-dna action，消耗 2 RNA → 1 DNA） */
  function formDNA() {
    const rna = state.value.resource['RNA']
    const dna = state.value.resource['DNA']
    if (rna && dna && rna.amount >= 2 && dna.amount < dna.max) {
      rna.amount -= 2
      dna.amount += 1
    }
  }

  /** 购买进化升级（membrane/organelles/nucleus/eukaryotic_cell/mitochondria） */
  function purchaseUpgrade(upgradeId: string) {
    const result = corePurchaseEvoUpgrade(state.value, upgradeId)
    if (result) {
      state.value = result
    } else {
      addMessage('RNA 或 DNA 不足，无法购买该升级。', 'warning', 'progress')
    }
  }

  /** 推进进化步骤（有性生殖/吞噬/多细胞等），消耗 DNA */
  function advanceStep(stepId: string) {
    // ⚠️ 必须在 state 更新前查名称：完成后该步骤不再出现在 getAvailableSteps 里
    const stepName = getAvailableSteps(state.value).find(s => s.id === stepId)?.name ?? stepId
    const result = coreAdvanceEvoStep(state.value, stepId)
    if (result) {
      state.value = result
      addMessage(`🧬 进化突破：${stepName}！`, 'special', 'progress')
    } else {
      addMessage('DNA 不足或条件不满足，无法推进进化。', 'warning', 'progress')
    }
  }

  /** 快速开始（跳过进化阶段，直接以人类身份开始文明） */
  function startCivilization(speciesId: string, ptrait: string = 'none') {
    _applyStartCivilization(speciesId, ptrait)
  }

  /**
   * 最终进化：选择种族 → sentience → 进入文明
   * 对标 legacy L5195-5212 action() + sentience()
   */
  function chooseRace(speciesId: string, ptrait: string = 'none') {
    const sentienceResult = coreEvolveSentience(state.value, speciesId)
    if (!sentienceResult) {
      addMessage('进化条件不满足或资源不足，请确认 RNA/DNA 充足且已完成人形化进化。', 'warning', 'progress')
      return
    }
    state.value = sentienceResult
    _applyStartCivilization(speciesId, ptrait)
  }

  /** 内部：初始化文明阶段状态 */
  function _applyStartCivilization(speciesId: string, ptrait: string = 'none') {
    const speciesLabels: Record<string, string> = {
      human: '人类', elven: '精灵', orc: '兽人', dwarf: '矮人', goblin: '地精',
    }

    try {
      localStorage.setItem('evozen_has_evolved_once', 'true')
    } catch (e) {
      console.warn('Failed to save evolution status to localStorage', e)
    }

    state.value.race.species = speciesId
    state.value.city.ptrait = ptrait
    syncRaceTraits()

    // 初始化种族人口资源（0个初始人口，上限0，需靠盖房）
    state.value.resource[speciesId] = {
      name: speciesLabels[speciesId] ?? speciesId,
      display: true,
      value: 0,
      amount: 0,
      max: 0,
      rate: 0,
      crates: 0,
      diff: 0,
      delta: 0,
    }

    // 给予初始资源（除了木材，其他资源初始隐藏，且均为0）
    state.value.resource['Food'].display = false // 由棍棒解锁
    state.value.resource['Food'].amount = 0
    state.value.resource['Lumber'].display = true
    state.value.resource['Lumber'].amount = 0
    state.value.resource['Stone'].display = false // 由骨制工具解锁
    state.value.resource['Stone'].amount = 0
    state.value.resource['Furs'].display = false // 由猎场/驻军解锁
    state.value.resource['Furs'].amount = 0

    // 隐藏进化资源
    state.value.resource['RNA'].display = false
    if (state.value.resource['DNA']) {
      state.value.resource['DNA'].display = false
    }

    const hunter = state.value.civic['hunter'] as { workers: number; display: boolean }
    if (hunter) {
      hunter.workers = 0
    }

    // 设置 UI
    state.value.settings.showEvolution = false
    state.value.settings.showCity = true

    const label = speciesLabels[speciesId] ?? speciesId
    const traitSummary = getSpeciesTraitDescriptors(speciesId)
      .map(trait => `${trait.label}${trait.activeNow ? '' : '（后续生效）'}`)
      .join(' / ')
    addMessage(`🎉 进化完成！你的 ${label} 部落踏上了文明之路。`, 'special', 'progress')
    if (traitSummary) {
      addMessage(`🧬 当前种族特质：${traitSummary}`, 'info', 'progress')
    }
    addMessage(`💡 提示：万幸的是你已经懂得如何在荒野中收集木材。先从周围捡拾一些木头，看能发掘出什么吧。`, 'info', 'progress')
  }

  /** 手动搜集资源（早期采集） */
  function gather(resourceId: string) {
    const res = state.value.resource[resourceId]
    if (!res) return
    let amount = 1
    // 石斧科技加成
    if (resourceId === 'Lumber' && (state.value.tech['axe'] ?? 0) >= 1) amount = 2
    if (resourceId === 'Stone' && (state.value.tech['mining'] ?? 0) >= 1) amount = 2
    if (res.max > 0 && res.amount >= res.max) return
    res.amount = Math.min(res.amount + amount, res.max > 0 ? res.max : Infinity)
  }

  // ---- 合成操作 ----

  /** 手动合成一次（一键制作） */
  function doCraft(craftId: CraftableId, qty: number = 1) {
    const result = manualCraft(state.value, craftId, qty)
    if (result) {
      state.value = result
      const names: Record<string, string> = { Plywood: '胶合板', Brick: '砖块', Wrought_Iron: '锻铁' }
      addMessage(`⚒ 手动合成了 ${qty} 份${names[craftId] ?? craftId}。`, 'success', 'progress')
    } else {
      addMessage('材料不足，无法合成。', 'warning', 'progress')
    }
  }

  /** 给指定合成产线增加一个工匠 */
  function assignCraftLine(craftId: CraftableId) {
    const result = coreAssignCraftsman(state.value, craftId)
    if (result) {
      state.value = result
    }
  }

  /** 从指定合成产线移除一个工匠 */
  function removeCraftLine(craftId: CraftableId) {
    const result = coreRemoveCraftsman(state.value, craftId)
    if (result) {
      state.value = result
    }
  }

  // ---- 贸易操作 ----

  /** 手动买入资源 */
  function tradeBuy(resourceId: string, qty: number = 1) {
    const result = coreBuyResource(state.value, resourceId, qty)
    if (result) {
      state.value = result
    } else {
      addMessage('金币不足或仓库已满。', 'warning', 'progress')
    }
  }

  /** 手动卖出资源 */
  function tradeSell(resourceId: string, qty: number = 1) {
    const result = coreSellResource(state.value, resourceId, qty)
    if (result) {
      state.value = result
    } else {
      addMessage('资源不足，无法出售。', 'warning', 'progress')
    }
  }

  /** 设置贸易路线 */
  function updateTradeRoute(index: number, route: TradeRoute) {
    state.value = coreSetTradeRoute(state.value, index, route)
  }

  function setMarketTradeQty(qty: number) {
    const limit = getManualTradeLimit(state.value)
    const nextQty = Math.max(1, Math.min(Math.floor(qty), limit))
    if (!state.value.city.market) {
      ;(state.value.city as any).market = { active: false, qty: nextQty }
      return
    }
    ;(state.value.city.market as { qty?: number }).qty = nextQty
  }

  function adjustMarketTradeQty(delta: number) {
    const currentQty = (state.value.city.market as { qty?: number } | undefined)?.qty ?? 1
    setMarketTradeQty(currentQty + delta)
  }

  function getBuyPrice(resourceId: string): number {
    return coreGetBuyPrice(resourceId, state.value)
  }

  function getSellPrice(resourceId: string): number {
    return coreGetSellPrice(resourceId, state.value)
  }

  // ---- 政府操作 ----

  /**
   * 切换政体
   * 对标 legacy/src/civics.js setGov()；冷却期间（govern.rev > 0）不可再次切换
   */
  function changeGov(govType: GovernmentType) {
    const result = coreChangeGovernment(state.value, govType)
    if (result) {
      state.value = result
      const def = GOVERNMENT_DEFS.find(d => d.id === govType)
      addMessage(`⚖️ 政体已变更为「${def?.name ?? govType}」，新制度冷却中…`, 'special', 'progress')
    } else {
      addMessage('政体切换条件未满足或仍在冷却中。', 'warning', 'progress')
    }
  }

  /**
   * 设置税率，钳位在 [0, maxTaxRate] 范围
   * 对标 legacy/src/civics.js taxRates 绑定
   */
  function setTaxRate(rate: number) {
    state.value = coreSetTaxRate(state.value, rate)
  }

  // ---- 仓储操作 ----

  /** 建造板条箱 */
  function doBuildCrate(qty: number = 1) {
    const result = coreBuildCrate(state.value, qty)
    if (result) {
      state.value = result
      addMessage(`📦 建造了 ${qty} 个板条箱。`, 'success', 'progress')
    } else {
      addMessage('胶合板不足或板条箱已达上限。', 'warning', 'progress')
    }
  }

  /** 建造集装箱 */
  function doBuildContainer(qty: number = 1) {
    const result = coreBuildContainer(state.value, qty)
    if (result) {
      state.value = result
      addMessage(`📦 建造了 ${qty} 个集装箱。`, 'success', 'progress')
    } else {
      addMessage('钢材不足或集装箱已达上限。', 'warning', 'progress')
    }
  }

  /** 给资源分配板条箱 */
  function doAssignCrate(resourceId: string, qty: number = 1) {
    const result = coreAssignCrate(state.value, resourceId, qty)
    if (result) { state.value = result }
  }

  /** 从资源取消分配板条箱 */
  function doUnassignCrate(resourceId: string, qty: number = 1) {
    const result = coreUnassignCrate(state.value, resourceId, qty)
    if (result) { state.value = result }
  }

  /** 给资源分配集装箱 */
  function doAssignContainer(resourceId: string, qty: number = 1) {
    const result = coreAssignContainer(state.value, resourceId, qty)
    if (result) { state.value = result }
  }

  /** 从资源取消分配集装箱 */
  function doUnassignContainer(resourceId: string, qty: number = 1) {
    const result = coreUnassignContainer(state.value, resourceId, qty)
    if (result) { state.value = result }
  }

  // ---- 军事操作 ----

  /** 设置战术等级 (0-4) */
  function setTactic(level: number) {
    const garrison = state.value.civic.garrison;
    if (!garrison) return;
    garrison.tactic = Math.max(0, Math.min(4, Math.floor(level)));
  }

  /** 调整出征人数 */
  function setRaid(count: number) {
    const garrison = state.value.civic.garrison;
    if (!garrison) return;
    const maxRaid = Math.max(0, garrison.workers - garrison.crew);
    garrison.raid = Math.max(0, Math.min(maxRaid, Math.floor(count)));
  }

  /** 雇佣佣兵 */
  function doHireMerc() {
    const result = coreHireMerc(state.value);
    if (result.success) {
      addMessage(`💰 花费 ${result.cost} 金币雇佣了一名佣兵！`, 'success', 'combat');
    } else {
      if (state.value.civic.garrison.workers >= state.value.civic.garrison.max) {
        addMessage('兵营已满，无法雇佣更多佣兵。', 'warning', 'combat');
      } else {
        addMessage(`金币不足。需要 ${result.cost} 金币。`, 'warning', 'combat');
      }
    }
  }

  /** 发起战役 */
  function doWarCampaign(govIndex: number) {
    const result = coreWarCampaign(state.value, govIndex);
    for (const msg of result.messages) {
      messages.value.push(msg);
    }
  }

  /** 获取佣兵费用 */
  function getMercCost(): number {
    return coreMercCost(state.value);
  }

  /** 获取军队评级 */
  function getArmyRating(soldiers?: number): number {
    const count = soldiers ?? coreGarrisonSize(state.value);
    return coreArmyRating(count, state.value);
  }

  /** 获取可用兵力 */
  function getGarrisonSize(): number {
    return coreGarrisonSize(state.value);
  }

  /** 启动 ARPA 项目 */
  function startArpa(projectId: string) {
    const result = coreStartArpa(state.value, projectId)
    if (result) {
      state.value = result
      const def = ARPA_PROJECTS.find(p => p.id === projectId)
      addMessage(`🏗️ 开始建造：${def?.name ?? projectId}，资源将毥次收取。`, 'info', 'progress')
    }
  }

  /** 停止 ARPA 项目 */
  function stopArpa(projectId: string) {
    state.value = coreStopArpa(state.value, projectId)
  }

  /** 设置纪念碑类型 */
  function changeMonumentType(mType: MonumentType) {
    state.value = coreSetMonumentType(state.value, mType)
  }

  return {
    state,
    messages,
    isPaused,
    isEvolving,
    population,
    year,
    day,
    season,
    morale,
    moraleCap,
    globalMultiplier,
    weatherLabel,
    init,
    togglePause,
    save,
    hardReset,
    getExportString,
    doImport,
    addMessage,
    clearMessages,
    lastSaveTime,
    isSettingsOpen,
    toggleSettings,
    canAfford,
    getBuildCost,
    build,
    isTechAvailable,
    canAffordTech,
    getTechCost,
    research,
    assignWorker,
    removeWorker,
    gatherRNA,
    formDNA,
    purchaseUpgrade,
    advanceStep,
    chooseRace,
    startCivilization,
    gather,
    // 进化查询（供 EvolutionPanel 使用）
    getAvailableUpgrades: () => getAvailableUpgrades(state.value),
    getAvailableSteps: () => getAvailableSteps(state.value),
    getAvailableRaces: () => getAvailableRaces(state.value),
    getUpgradeCount: (id: string) => getUpgradeCount(state.value, id),
    getUpgradeCost: (id: string) => getUpgradeCost(state.value, id),
    PLANET_TRAITS,
    // 合成系统
    doCraft,
    assignCraftLine,
    removeCraftLine,
    // 贸易系统
    tradeBuy,
    tradeSell,
    updateTradeRoute,
    setMarketTradeQty,
    adjustMarketTradeQty,
    getBuyPrice,
    getSellPrice,
    getManualTradeLimit: () => getManualTradeLimit(state.value),
    getTradeRouteQtyLimit: () => getTradeRouteQtyLimit(state.value),
    // 政府系统
    changeGov,
    setTaxRate,
    getMaxTaxRate: () => getMaxTaxRate(state.value),
    GOVERNMENT_DEFS,
    // 队列系统
    isQueueUnlocked,
    queueMax,
    canEnqueueBuilding,
    enqueueBuilding,
    dequeueBuilding,
    toggleQueue,
    // 仓储系统
    doBuildCrate,
    doBuildContainer,
    doAssignCrate,
    doUnassignCrate,
    doAssignContainer,
    doUnassignContainer,
    STORABLE_RESOURCES,
    CRATE_VALUE,
    CONTAINER_VALUE,
    getCrateValue,
    CRATE_COST_PLYWOOD,
    CONTAINER_COST_STEEL,
    // 军事系统
    setTactic,
    setRaid,
    doHireMerc,
    doWarCampaign,
    getMercCost,
    getArmyRating,
    getGarrisonSize,
    TACTIC_NAMES,
    // ARPA 系统
    startArpa,
    stopArpa,
    changeMonumentType,
    getArpaProjectState: (id: string) => getArpaProjectState(state.value, id),
    getAvailableArpaProjects: () => getAvailableArpaProjects(state.value),
    getMonumentType: () => getMonumentType(state.value),
    arpaCost: (id: string) => arpaCost(state.value, id),
    isArpaAvailable: (id: string) => isArpaAvailable(state.value, id),
    ARPA_PROJECTS,
    MONUMENT_NAMES,
  }
})
