/**
 * Pinia 游戏状态 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameMessage } from '@evozen/shared-types'
import { createNewGame, gameTick, saveGame, loadGame, exportSave, importSave, BASIC_STRUCTURES, BASIC_TECHS, BASE_JOBS } from '@evozen/game-core'

export const useGameStore = defineStore('game', () => {
  // ---- 核心状态 ----
  const state = ref<GameState>(createNewGame())
  const messages = ref<GameMessage[]>([])
  const tickInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const tickSpeed = ref(250) // ms per tick
  const isPaused = ref(false)

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

  // ---- 方法 ----

  /** 初始化游戏：尝试读档，否则新建 */
  function init() {
    const saved = loadGame()
    if (saved) {
      state.value = saved
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
    // 先计算建筑对资源上限的影响
    applyBuildingEffects()
    // 然后执行 tick
    const tickOutput = gameTick(state.value)
    state.value = tickOutput.state
    for (const msg of tickOutput.result.messages) {
      messages.value.push(msg)
    }
    // 人口增长
    handlePopGrowth()
    // 自动存档（每 100 tick）
    if ((state.value.stats.days ?? 0) % 100 === 0 && state.value.stats.days > 0) {
      saveGame(state.value)
    }
  }

  /** 计算并应用建筑效果到资源上限 */
  function applyBuildingEffects() {
    if (isEvolving.value) return
    const s = state.value
    const species = s.race.species

    // --- 人口上限 ---
    let popCap = 0
    const basicHousing = getStructCount('basic_housing')
    const cottages = getStructCount('cottage')
    popCap += basicHousing * 1
    popCap += cottages * 2
    if (s.resource[species]) {
      s.resource[species].max = Math.max(1, popCap)
    }

    // --- 食物上限 ---
    let foodMax = 250
    const farms = getStructCount('farm')
    const silos = getStructCount('silo')
    foodMax += farms * 50
    foodMax += silos * 250
    s.resource['Food'].max = foodMax

    // --- 木材上限 ---
    let lumberMax = 200
    const lumberYards = getStructCount('lumber_yard')
    const sheds = getStructCount('shed')
    lumberMax += lumberYards * 100
    lumberMax += sheds * 75
    s.resource['Lumber'].max = lumberMax

    // --- 石头上限 ---
    let stoneMax = 200
    const quarries = getStructCount('rock_quarry')
    stoneMax += quarries * 100
    stoneMax += sheds * 75
    s.resource['Stone'].max = stoneMax

    // --- 铜上限 ---
    let copperMax = 100
    copperMax += sheds * 50
    s.resource['Copper'].max = copperMax

    // --- 铁上限 ---
    let ironMax = 100
    ironMax += sheds * 50
    s.resource['Iron'].max = ironMax

    // --- 水泥上限 ---
    let cementMax = 100
    cementMax += sheds * 40
    s.resource['Cement'].max = cementMax

    // --- 煤上限 ---
    let coalMax = 50
    coalMax += sheds * 30
    s.resource['Coal'].max = coalMax

    // --- 毛皮上限 ---
    let fursMax = 100
    fursMax += sheds * 40
    s.resource['Furs'].max = fursMax

    // --- 毛皮显示（有猎人工作时自动显示）---
    const hunterWorkers = (s.civic['hunter'] as { workers?: number } | undefined)?.workers ?? 0
    if (hunterWorkers > 0) {
      s.resource['Furs'].display = true
    }

    // --- 知识上限 ---
    let knowledgeMax = 100
    const libraries = getStructCount('library')
    const universities = getStructCount('university')
    knowledgeMax += libraries * 125
    knowledgeMax += universities * 500
    s.resource['Knowledge'].max = knowledgeMax

    // --- 金币上限 ---
    let moneyMax = 1000
    const banks = getStructCount('bank')
    moneyMax += banks * 1800
    s.resource['Money'].max = moneyMax

    // --- 岗位上限 ---
    // 农民上限由农场决定
    setJobMax('farmer', farms)
    // 伐木工无固定上限
    setJobMax('lumberjack', -1)
    // 石工无固定上限
    setJobMax('quarry_worker', -1)
    // 矿工上限由矿井决定
    setJobMax('miner', getStructCount('mine'))
    // 煤矿工人由煤矿决定
    setJobMax('coal_miner', getStructCount('coal_mine'))
    // 水泥工人由水泥厂决定
    setJobMax('cement_worker', getStructCount('cement_plant'))
    // 银行家由银行数量决定
    setJobMax('banker', banks)
    // 教授由图书馆决定
    setJobMax('professor', libraries + universities)

    // --- 科技解锁资源显示 ---
    if ((s.tech['mining'] ?? 0) >= 3) {
      s.resource['Iron'].display = true
    }
    if ((s.tech['mining'] ?? 0) >= 4) {
      s.resource['Coal'].display = true
    }
    if ((s.tech['cement'] ?? 0) >= 1) {
      s.resource['Cement'].display = true
    }
    if ((s.tech['currency'] ?? 0) >= 1) {
      s.resource['Money'].display = true
    }
    if ((s.tech['primitive'] ?? 0) >= 3) {
      s.resource['Knowledge'].display = true
    }
    if ((s.tech['mining'] ?? 0) >= 1) {
      s.resource['Copper'].display = true
    }

    // --- 科技解锁岗位显示 ---
    for (const job of BASE_JOBS) {
      if (job.id === 'unemployed' || job.id === 'hunter') continue
      if (!job.requiredTech) continue
      let unlocked = true
      for (const [techId, lvl] of Object.entries(job.requiredTech)) {
        if ((s.tech[techId] ?? 0) < lvl) { unlocked = false; break }
      }
      const civicJob = s.civic[job.id] as { display?: boolean } | undefined
      if (civicJob && unlocked) {
        civicJob.display = true
      }
    }

    // --- 市政 Tab 自动显示 ---
    const hasAnyJob = BASE_JOBS.some(j => {
      if (j.id === 'unemployed' || j.id === 'hunter') return false
      return (s.civic[j.id] as { display?: boolean } | undefined)?.display
    })
    if (hasAnyJob) {
      s.settings.showCivic = true
    }

    // --- 资源 Tab 自动显示 (5种以上资源可见时) ---
    const visibleResCount = Object.values(s.resource).filter(r => r.display).length
    if (visibleResCount >= 6) {
      s.settings.showResources = true
    }
  }

  function getStructCount(id: string): number {
    return (state.value.city[id] as { count: number } | undefined)?.count ?? 0
  }

  function setJobMax(jobId: string, max: number) {
    const job = state.value.civic[jobId] as { max: number } | undefined
    if (job) job.max = max
  }

  /** 人口增长：有食物且有空房间时缓慢增长 */
  function handlePopGrowth() {
    if (isEvolving.value) return
    const s = state.value
    const species = s.race.species
    const pop = s.resource[species]
    if (!pop) return

    const food = s.resource['Food']
    if (!food || food.amount <= 0) return

    // 有食物且人口未达上限时，缓慢增长
    if (pop.amount < pop.max && food.amount > food.max * 0.1) {
      pop.amount += 0.005 // 每 tick 增长 0.005 人
      if (Math.floor(pop.amount) > Math.floor(pop.amount - 0.005)) {
        // 新增了一个完整市民
        const newPop = Math.floor(pop.amount)
        addMessage(`一位新市民加入了你的部落！人口: ${newPop}`, 'success', 'progress')
        // 新市民默认为失业
        const unemployed = s.civic['unemployed'] as { workers: number }
        if (unemployed) unemployed.workers++
      }
    }
  }

  /** 暂停/恢复 */
  function togglePause() {
    isPaused.value = !isPaused.value
  }

  /** 手动存档 */
  function save() {
    const ok = saveGame(state.value)
    addMessage(ok ? '存档成功！' : '存档失败。', ok ? 'success' : 'danger', 'progress')
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
    messages.value.push({ text, type, category })
    if (messages.value.length > 200) {
      messages.value = messages.value.slice(-100)
    }
  }

  // ---- 建筑操作 ----

  /** 检查是否能购买建筑 */
  function canAfford(structureId: string): boolean {
    const def = BASIC_STRUCTURES.find(s => s.id === structureId)
    if (!def) return false
    for (const [techId, lvl] of Object.entries(def.reqs)) {
      if ((state.value.tech[techId] ?? 0) < lvl) return false
    }
    const count = getStructCount(structureId)
    for (const [resId, costFn] of Object.entries(def.costs)) {
      const cost = costFn(state.value, count)
      const have = state.value.resource[resId]?.amount ?? 0
      if (have < cost) return false
    }
    return true
  }

  /** 获取建筑费用 */
  function getBuildCost(structureId: string): Record<string, number> {
    const def = BASIC_STRUCTURES.find(s => s.id === structureId)
    if (!def) return {}
    const count = getStructCount(structureId)
    const costs: Record<string, number> = {}
    for (const [resId, costFn] of Object.entries(def.costs)) {
      costs[resId] = costFn(state.value, count)
    }
    return costs
  }

  /** 建造建筑 */
  function build(structureId: string) {
    if (!canAfford(structureId)) return
    const def = BASIC_STRUCTURES.find(s => s.id === structureId)
    if (!def) return

    const count = getStructCount(structureId)

    // 扣除资源
    for (const [resId, costFn] of Object.entries(def.costs)) {
      const cost = costFn(state.value, count)
      state.value.resource[resId].amount -= cost
    }

    // 增加建筑
    if (!state.value.city[structureId]) {
      (state.value.city as Record<string, unknown>)[structureId] = { count: 0, on: 0 }
    }
    const building = state.value.city[structureId] as { count: number; on?: number }
    building.count++
    if (building.on !== undefined) building.on++

    addMessage(`${def.name}已竣工。`, 'success', 'progress')
  }

  // ---- 科技操作 ----

  /** 检查科技是否可见可研究 */
  function isTechAvailable(techId: string): boolean {
    const def = BASIC_TECHS.find(t => t.id === techId)
    if (!def) return false
    const [grantKey, grantLvl] = def.grant
    if ((state.value.tech[grantKey] ?? 0) >= grantLvl) return false
    for (const [reqKey, reqLvl] of Object.entries(def.reqs)) {
      if ((state.value.tech[reqKey] ?? 0) < reqLvl) return false
    }
    return true
  }

  function canAffordTech(techId: string): boolean {
    const def = BASIC_TECHS.find(t => t.id === techId)
    if (!def) return false
    for (const [resId, cost] of Object.entries(def.costs)) {
      if ((state.value.resource[resId]?.amount ?? 0) < cost) return false
    }
    return true
  }

  function research(techId: string) {
    const def = BASIC_TECHS.find(t => t.id === techId)
    if (!def || !canAffordTech(techId)) return
    for (const [resId, cost] of Object.entries(def.costs)) {
      state.value.resource[resId].amount -= cost
    }
    const [grantKey, grantLvl] = def.grant
    state.value.tech[grantKey] = grantLvl
    addMessage(`🔬 ${def.name} 研发完成！`, 'special', 'progress')
  }

  // ---- 岗位操作 ----

  function assignWorker(jobId: string) {
    const job = state.value.civic[jobId] as { workers: number; max: number; display?: boolean } | undefined
    const unemployed = state.value.civic['unemployed'] as { workers: number } | undefined
    if (!job || !unemployed || unemployed.workers <= 0) return
    if (job.max >= 0 && job.workers >= job.max) return
    job.workers++
    unemployed.workers--
  }

  function removeWorker(jobId: string) {
    const job = state.value.civic[jobId] as { workers: number } | undefined
    const unemployed = state.value.civic['unemployed'] as { workers: number } | undefined
    if (!job || !unemployed || job.workers <= 0) return
    job.workers--
    unemployed.workers++
  }

  // ---- 进化阶段操作 ----

  function gatherRNA() {
    const rna = state.value.resource['RNA']
    if (rna && rna.amount < rna.max) {
      rna.amount += 1
    }
  }

  function formDNA() {
    const rna = state.value.resource['RNA']
    const dna = state.value.resource['DNA']
    if (rna && dna && rna.amount >= 2 && dna.amount < dna.max) {
      rna.amount -= 2
      dna.amount += 1
    }
  }

  /** 开始文明（离开进化阶段） */
  function startCivilization(speciesId: string) {
    const speciesLabels: Record<string, string> = {
      human: '人类', elven: '精灵', orc: '兽人', dwarf: '矮人', goblin: '地精',
    }

    state.value.race.species = speciesId

    // 初始化种族人口资源（1个初始人口，上限1）
    state.value.resource[speciesId] = {
      name: speciesLabels[speciesId] ?? speciesId,
      display: true,
      value: 0,
      amount: 1,
      max: 1,
      rate: 0,
      crates: 0,
      diff: 0,
      delta: 0,
    }

    // 给予初始资源
    state.value.resource['Food'].display = true
    state.value.resource['Food'].amount = 20
    state.value.resource['Lumber'].display = true
    state.value.resource['Lumber'].amount = 15
    state.value.resource['Stone'].display = true
    state.value.resource['Stone'].amount = 0
    state.value.resource['Furs'].display = true
    state.value.resource['Furs'].amount = 0

    // 隐藏进化资源
    state.value.resource['RNA'].display = false
    state.value.resource['DNA'].display = false

    // 设置初始猎人（1个人口全是猎人）
    const hunter = state.value.civic['hunter'] as { workers: number; display: boolean }
    if (hunter) {
      hunter.workers = 1
      hunter.display = true
    }

    // 设置 UI
    state.value.settings.showEvolution = false
    state.value.settings.showCity = true

    const label = speciesLabels[speciesId] ?? speciesId
    addMessage(`🎉 进化完成！你的 ${label} 部落踏上了文明之路。`, 'special', 'progress')
    addMessage(`💡 提示：先研究"棍棒"来解锁更多科技。点击"研究"标签页查看。`, 'info', 'progress')
    addMessage(`💡 提示：在"洞穴"标签页可以手动搜集食物和木材。`, 'info', 'progress')
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

  return {
    state,
    messages,
    isPaused,
    isEvolving,
    population,
    year,
    day,
    season,
    init,
    togglePause,
    save,
    getExportString,
    doImport,
    addMessage,
    canAfford,
    getBuildCost,
    build,
    isTechAvailable,
    canAffordTech,
    research,
    assignWorker,
    removeWorker,
    gatherRNA,
    formDNA,
    startCivilization,
    gather,
  }
})
