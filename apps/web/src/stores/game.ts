/**
 * Pinia 游戏状态 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameMessage } from '@evozen/shared-types'
import {
  createNewGame,
  gameTick,
  saveGame,
  loadGame,
  exportSave,
  importSave,
  BASIC_STRUCTURES,
  BASIC_TECHS,
  BASE_JOBS,
  manualCraft,
  assignCraftsman as coreAssignCraftsman,
  removeCraftsman as coreRemoveCraftsman,
  CRAFTABLE_IDS,
  type CraftableId,
  type FoundryState,
  buyResource as coreBuyResource,
  sellResource as coreSellResource,
  getBuyPrice as coreGetBuyPrice,
  getSellPrice as coreGetSellPrice,
  getManualTradeLimit,
  getMaxTradeRoutes,
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
  // 仓储系统
  buildCrate as coreBuildCrate,
  buildContainer as coreBuildContainer,
  assignCrate as coreAssignCrate,
  unassignCrate as coreUnassignCrate,
  assignContainer as coreAssignContainer,
  unassignContainer as coreUnassignContainer,
  getStorageBonus,
  getStorageMultiplier,
  SHED_BASE_VALUES,
  getCrateValue,
  STORABLE_RESOURCES,
  CRATE_VALUE,
  CONTAINER_VALUE,
  CRATE_COST_PLYWOOD,
  CONTAINER_COST_STEEL,
  assignSpeciesTraits,
  getLibraryKnowledgeCapMultiplier,
  getModifiedTechCosts,
  getSpeciesTraitDescriptors,
  // 军事系统
  mercCost as coreMercCost,
  hireMerc as coreHireMerc,
  warCampaign as coreWarCampaign,
  armyRating as coreArmyRating,
  garrisonSize as coreGarrisonSize,
  TACTIC_NAMES,
} from '@evozen/game-core'

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
    const farms = getStructCount('farm')
    popCap += basicHousing * 1
    popCap += cottages * 2
    if ((s.tech['farm'] ?? 0) >= 1) {
      popCap += farms
    }
    if (s.resource[species]) {
      s.resource[species].max = Math.max(1, popCap)
    }

    // --- 食物上限 ---
    let foodMax = 250
    const silos = getStructCount('silo')
    const smokehouses = getStructCount('smokehouse')
    foodMax += farms * 50
    foodMax += silos * 500
    foodMax += smokehouses * 100
    s.resource['Food'].max = foodMax

    // --- 仓库(shed)存储乘数 — 对标 legacy storageMultipler() ---
    const sheds = getStructCount('shed')
    const storageMult = getStorageMultiplier(s)

    // --- 木材上限 ---
    let lumberMax = 200
    const lumberYards = getStructCount('lumber_yard')
    const sawmills = getStructCount('sawmill')
    lumberMax += lumberYards * 100
    lumberMax += sawmills * 200
    lumberMax += Math.round(sheds * (SHED_BASE_VALUES['Lumber'] ?? 0) * storageMult)
    lumberMax += getStorageBonus(s, 'Lumber')
    s.resource['Lumber'].max = lumberMax

    // --- 石头上限 ---
    let stoneMax = 200
    const quarries = getStructCount('rock_quarry')
    stoneMax += quarries * 100
    stoneMax += Math.round(sheds * (SHED_BASE_VALUES['Stone'] ?? 0) * storageMult)
    stoneMax += getStorageBonus(s, 'Stone')
    s.resource['Stone'].max = stoneMax

    // --- 铜上限 ---
    let copperMax = 100
    copperMax += Math.round(sheds * (SHED_BASE_VALUES['Copper'] ?? 0) * storageMult)
    copperMax += getStorageBonus(s, 'Copper')
    s.resource['Copper'].max = copperMax

    // --- 铁上限 ---
    let ironMax = 100
    ironMax += Math.round(sheds * (SHED_BASE_VALUES['Iron'] ?? 0) * storageMult)
    ironMax += getStorageBonus(s, 'Iron')
    s.resource['Iron'].max = ironMax

    // --- 水泥上限 ---
    let cementMax = 100
    cementMax += Math.round(sheds * (SHED_BASE_VALUES['Cement'] ?? 0) * storageMult)
    cementMax += getStorageBonus(s, 'Cement')
    s.resource['Cement'].max = cementMax

    // --- 煤上限 ---
    let coalMax = 50
    coalMax += Math.round(sheds * (SHED_BASE_VALUES['Coal'] ?? 0) * storageMult)
    coalMax += getStorageBonus(s, 'Coal')
    s.resource['Coal'].max = coalMax

    // --- 毛皮上限 ---
    let fursMax = 100
    fursMax += Math.round(sheds * (SHED_BASE_VALUES['Furs'] ?? 0) * storageMult)
    fursMax += getStorageBonus(s, 'Furs')
    s.resource['Furs'].max = fursMax

    // --- 钢上限 (storage >= 3 时 shed 才提供钢上限) ---
    let steelMax = 50
    if ((s.tech['storage'] ?? 0) >= 3) {
      steelMax += Math.round(sheds * (SHED_BASE_VALUES['Steel'] ?? 0) * storageMult)
    }
    steelMax += getStorageBonus(s, 'Steel')
    s.resource['Steel'].max = steelMax

    // --- 铝上限 ---
    let aluminiumMax = 50
    aluminiumMax += Math.round(sheds * (SHED_BASE_VALUES['Aluminium'] ?? 0) * storageMult)
    aluminiumMax += getStorageBonus(s, 'Aluminium')
    s.resource['Aluminium'].max = aluminiumMax

    // --- 石油上限 --- 对标 legacy main.js L9139-9148
    // base = 0, oil_well: +500/座, oil_depot: +1000/座
    const oilWells = getStructCount('oil_well')
    const oilDepots = getStructCount('oil_depot')
    let oilMax = 0
    oilMax += oilWells * 500
    oilMax += oilDepots * 1000
    s.resource['Oil'].max = oilMax
    // Oil 在 oil:1 后显示
    if ((s.tech['oil'] ?? 0) >= 1) {
      s.resource['Oil'].display = true
    }

    // --- 钛上限 --- 对标 legacy main.js L8211 (base 50)
    // shed 在 storage >= 4 时提供 +20×storageMult
    let titaniumMax = 50
    if ((s.tech['storage'] ?? 0) >= 4) {
      titaniumMax += Math.round(sheds * (SHED_BASE_VALUES['Titanium'] ?? 0) * storageMult)
    }
    titaniumMax += getStorageBonus(s, 'Titanium')
    s.resource['Titanium'].max = titaniumMax
    // Titanium 在 high_tech:3 后显示 — 对标 legacy tech.js L4901
    if ((s.tech['high_tech'] ?? 0) >= 3) {
      s.resource['Titanium'].display = true
    }

    // --- 毛皮显示（有猎人工作时自动显示）---
    const hunterWorkers = (s.civic['hunter'] as { workers?: number } | undefined)?.workers ?? 0
    if (hunterWorkers > 0) {
      s.resource['Furs'].display = true
    }

    // --- 知识上限 ---
    let knowledgeMax = 100
    const libraries = getStructCount('library')
    const universities = getStructCount('university')
    const wardenclyffes = getStructCount('wardenclyffe')
    const scientists = (s.civic['scientist'] as { workers?: number } | undefined)?.workers ?? 0
    const universityBase = (s.tech['science'] ?? 0) >= 8 ? 700 : 500
    const universityMult = (s.tech['science'] ?? 0) >= 4 ? 1 + libraries * 0.02 : 1
    const journalMult = (s.tech['science'] ?? 0) >= 5 ? 1 + scientists * 0.12 : 1
    knowledgeMax += libraries * 125 * getLibraryKnowledgeCapMultiplier(s) * journalMult
    knowledgeMax += universities * universityBase * universityMult
    knowledgeMax += wardenclyffes * 1000
    s.resource['Knowledge'].max = knowledgeMax

    // --- 金币上限 ---
    let moneyMax = 1000
    const banks = getStructCount('bank')
    let bankCapacity = 1800
    if ((s.tech['banking'] ?? 0) >= 3) {
      bankCapacity = 4000
    }
    moneyMax += banks * bankCapacity
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
    // 水泥工人由水泥厂决定（原版每座 +2）
    setJobMax('cement_worker', getStructCount('cement_plant') * 2)
    // 银行家由银行数量决定
    setJobMax('banker', banks)
    // 教授由大学决定；图书馆只影响知识产出
    setJobMax('professor', universities)
    // 科学家由沃登克里弗塔决定
    setJobMax('scientist', wardenclyffes)

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
    if ((s.tech['smelting'] ?? 0) >= 2) {
      s.resource['Steel'].display = true
    }
    if ((s.tech['alumina'] ?? 0) >= 1) {
      s.resource['Aluminium'].display = true
    }

    // --- 工匠上限由铸造厂决定 ---
    const foundries = getStructCount('foundry')
    setJobMax('craftsman', foundries)

    // --- 娱乐者上限由圆形剧场决定 ---
    const amphitheatres = getStructCount('amphitheatre')
    setJobMax('entertainer', amphitheatres)

    // --- 牧师上限由神庙决定 ---
    const temples = getStructCount('temple')
    setJobMax('priest', temples)

    // --- 信仰上限 — 神龛 +25/座，寺庙 +50/座（theology:2 解锁寺庙）---
    const shrines = getStructCount('shrine')
    let faithMax = 100
    faithMax += shrines * 25
    faithMax += temples * 50
    if (s.resource['Faith']) {
      s.resource['Faith'].max = faithMax
      // theology:1 解锁后显示信仰资源
      if ((s.tech['theology'] ?? 0) >= 1) {
        s.resource['Faith'].display = true
      }
    }

    // --- 板条箱/集装箱上限由装运站/集装箱港口决定 ---
    const storageYards = getStructCount('storage_yard')
    const warehouses = getStructCount('warehouse')
    const crateCapacity = (s.tech['container'] ?? 0) >= 3 ? 20 : 10
    const containerCapacity = (s.tech['steel_container'] ?? 0) >= 2 ? 20 : 10
    if (s.resource['Crates']) {
      s.resource['Crates'].max = storageYards * crateCapacity
    }
    if (s.resource['Containers']) {
      s.resource['Containers'].max = warehouses * containerCapacity
    }

    // --- 板条箱/集装箱显示 ---
    if ((s.tech['container'] ?? 0) >= 1) {
      s.resource['Crates'].display = true
      s.settings.showStorage = true
    }
    if ((s.tech['steel_container'] ?? 0) >= 1) {
      s.resource['Containers'].display = true
    }

    // --- 铸造科技解锁合成资源显示 ---
    if ((s.tech['foundry'] ?? 0) >= 1) {
      s.resource['Plywood'].display = true
      s.resource['Brick'].display = true
      s.resource['Wrought_Iron'].display = true
      if ((s.tech['alumina'] ?? 0) >= 1) {
        s.resource['Sheet_Metal'].display = true
      }
      // 确保铸造厂 foundry 状态存在
      if (!s.city['foundry']) {
        (s.city as Record<string, unknown>)['foundry'] = {
          count: 0, on: 0, Plywood: 0, Brick: 0, Wrought_Iron: 0, Sheet_Metal: 0
        }
      } else {
        // 向前兼容：确保存在 Sheet_Metal
        if ((s.city['foundry'] as any).Sheet_Metal === undefined) {
          (s.city['foundry'] as any).Sheet_Metal = 0
        }
      }
    }

    // --- 贸易路线自动调整 ---
    if ((s.tech['trade'] ?? 0) >= 1) {
      s.settings.showMarket = true
      const maxRoutes = getMaxTradeRoutes(s)
      if (!(s.city as any).trade_routes) {
        (s.city as any).trade_routes = []
      }
      const routes = (s.city as any).trade_routes as TradeRoute[]
      // 扩充路线槽位
      while (routes.length < maxRoutes) {
        routes.push({ resource: 'Food', action: 'none', qty: 1 })
      }
      // 缩减路线槽位（如果贸易站被拆除）
      if (routes.length > maxRoutes) {
        routes.length = maxRoutes
      }
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

  function syncRaceTraits() {
    assignSpeciesTraits(state.value.race, state.value.race.species)
  }

  function getTechCost(techId: string): Record<string, number> {
    const def = BASIC_TECHS.find(t => t.id === techId)
    if (!def) return {}
    return getModifiedTechCosts(state.value, def.costs, def.category)
  }

  function setJobMax(jobId: string, max: number) {
    const job = state.value.civic[jobId] as { max: number } | undefined
    if (job) job.max = max
  }

  /**
   * 人口增长：基于概率的增长系统
   * 对标原版 legacy/src/main.js L3906-3973
   *
   * 原版逻辑：
   * - 在 long loop（每 20 个 fast tick = 5秒）中执行一次
   * - Math.rand(0, upperBound) <= lowerBound 时新增 1 人
   * - lowerBound = reproduction 科技等级（无科技时为 0）
   * - reproduction >= 2 时，hospital 数量会继续提高人口增长概率
   * - upperBound = 当前人口 × (3 - 2^time_multiplier)
   *
   * 简化实现：仍使用 tick 计数器模拟 long loop 频率
   */
  function handlePopGrowth() {
    if (isEvolving.value) return
    const s = state.value
    const species = s.race.species
    const pop = s.resource[species]
    if (!pop) return

    const food = s.resource['Food']
    if (!food || food.amount <= 0) return

    // 跟踪 long loop 计数器（每20个tick执行一次增长检查）
    if (!(s as any)._popGrowthTick) (s as any)._popGrowthTick = 0
    ;(s as any)._popGrowthTick++
    if ((s as any)._popGrowthTick < 20) return
    ;(s as any)._popGrowthTick = 0

    // 有食物且人口未达上限时，才尝试增长
    if (pop.amount >= pop.max) return
    if (food.amount <= 0) return

    // reproduction 科技提高增长概率（原版 main.js L3917）
    let lowerBound = s.tech['reproduction'] ?? 0
    if ((s.tech['reproduction'] ?? 0) >= 2) {
      lowerBound += getStructCount('hospital')
    }

    // 原版 upperBound = currentPop * (3 - 2^0.25) ≈ currentPop * 1.811
    let upperBound = Math.floor(pop.amount * (3 - Math.pow(2, 0.25)))
    if (upperBound < 2) upperBound = 2  // 防止初始人口太少时永远无法增长

    // 原版使用整数随机：Math.rand(0, upperBound) <= lowerBound
    // Math.rand(0, N) = Math.floor(Math.random() * N)，返回 0..N-1，共 N 个值
    // P(rand <= K) = (K+1) / N
    // 因此 lowerBound=0 时概率 = 1/upperBound
    if (Math.random() < (lowerBound + 1) / upperBound) {
      pop.amount = Math.floor(pop.amount) + 1
      const newPop = Math.floor(pop.amount)
      addMessage(`一位新市民加入了你的部落！人口: ${newPop}`, 'success', 'progress')
      // 新市民默认为失业
      const unemployed = s.civic['unemployed'] as { workers: number }
      if (unemployed) unemployed.workers++
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

    // 兵营特殊逻辑：建造时增加士兵上限并激活驻军显示
    if (structureId === 'garrison') {
      const soldiers = (state.value.tech['military'] ?? 0) >= 5 ? 3 : 2;
      state.value.civic.garrison.max += soldiers;
      if (!state.value.civic.garrison.display) {
        state.value.civic.garrison.display = true;
        state.value.settings.showMil = true;
        state.value.resource.Furs.display = true;
      }
    }
  }

  // ---- 建筑队列操作 ----

  const isQueueUnlocked = computed(() => coreIsQueueUnlocked(state.value))
  const queueMax = computed(() => getQueueMax(state.value))
  const canEnqueueBuilding = computed(() => coreCanEnqueue(state.value))

  function enqueueBuilding(structureId: string) {
    if (!coreCanEnqueue(state.value)) return
    const def = BASIC_STRUCTURES.find(s => s.id === structureId)
    if (!def) return
    
    const count = getStructCount(structureId)
    const cost: Record<string, number> = {}
    for (const [resId, costFn] of Object.entries(def.costs)) {
      cost[resId] = costFn(state.value, count)
    }
    
    state.value.queue.queue = state.value.queue.queue || []
    state.value.queue.queue.push({
      id: structureId,
      action: `city.${structureId}`,
      type: 'building',
      label: def.name,
      q: 1,
      qs: state.value.queue.queue.length,
      time: 0,
      t_max: 0,
      cost,
      progress: {}
    })
    
    addMessage(`已将 ${def.name} 加入建造队列。`, 'info', 'progress')
  }

  function dequeueBuilding(index: number) {
    if (state.value.queue.queue && index >= 0 && index < state.value.queue.queue.length) {
      const item = state.value.queue.queue[index]
      if (item.progress) {
        // 返还已投入的资源
        for (const [resId, amount] of Object.entries(item.progress)) {
           if (state.value.resource[resId]) {
             state.value.resource[resId].amount += amount
           }
        }
      }
      state.value.queue.queue.splice(index, 1)
    }
  }

  function toggleQueue() {
    coreToggleQueueMode(state.value)
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
    const costs = getTechCost(techId)
    for (const [resId, cost] of Object.entries(costs)) {
      if ((state.value.resource[resId]?.amount ?? 0) < cost) return false
    }
    return true
  }

  function research(techId: string) {
    const def = BASIC_TECHS.find(t => t.id === techId)
    if (!def || !canAffordTech(techId)) return
    const costs = getTechCost(techId)
    for (const [resId, cost] of Object.entries(costs)) {
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

    // 如果移除的是工匠，同步清理分配
    if (jobId === 'craftsman') {
      const foundry = state.value.city['foundry'] as FoundryState | undefined
      if (foundry) {
        let totalAssigned = 0
        for (const id of CRAFTABLE_IDS) {
          totalAssigned += foundry[id] ?? 0
        }
        // 如果总分配超过工匠数，从后往前减
        while (totalAssigned > job.workers) {
          for (let i = CRAFTABLE_IDS.length - 1; i >= 0; i--) {
            const cid = CRAFTABLE_IDS[i]
            if ((foundry[cid] ?? 0) > 0) {
              foundry[cid] = (foundry[cid] ?? 0) - 1
              totalAssigned--
              break
            }
          }
        }
      }
    }
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
    syncRaceTraits()

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
    const traitSummary = getSpeciesTraitDescriptors(speciesId)
      .map(trait => `${trait.label}${trait.activeNow ? '' : '（后续生效）'}`)
      .join(' / ')
    addMessage(`🎉 进化完成！你的 ${label} 部落踏上了文明之路。`, 'special', 'progress')
    if (traitSummary) {
      addMessage(`🧬 当前种族特质：${traitSummary}`, 'info', 'progress')
    }
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
    const maxRate = getMaxTaxRate(state.value)
    const clamped = Math.max(0, Math.min(maxRate, Math.round(rate)))
    if (state.value.civic.taxes) {
      state.value.civic.taxes.tax_rate = clamped
    }
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
    getExportString,
    doImport,
    addMessage,
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
    startCivilization,
    gather,
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
  }
})
