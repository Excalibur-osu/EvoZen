import type { GameState, ResourceState, TradeRoute } from '@evozen/shared-types'
import { getResourceName } from './resourceNames'

type ResourceSnapshot = ResourceState & { id: string }

const TICKS_PER_SECOND = 4

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (Math.abs(n) >= 10) return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function fmtSigned(n: number): string {
  if (Math.abs(n) < 0.005) return '0'
  return `${n > 0 ? '+' : ''}${fmt(n)}`
}

function perSecond(n: number): string {
  return `${fmtSigned(n * TICKS_PER_SECOND)}/s`
}

function countCity(state: GameState, id: string): number {
  const value = state.city[id] as { count?: number; on?: number } | undefined
  return Number(value?.on ?? value?.count ?? 0)
}

function countSpace(state: GameState, id: string): number {
  const value = state.space[id] as { count?: number; on?: number } | undefined
  return Number(value?.on ?? value?.count ?? 0)
}

function countInterstellar(state: GameState, id: string): number {
  const value = state.interstellar[id] as { count?: number; on?: number } | undefined
  return Number(value?.on ?? value?.count ?? 0)
}

function workers(state: GameState, id: string): number {
  const value = state.civic[id] as { workers?: number; assigned?: number } | undefined
  return Number(value?.workers ?? value?.assigned ?? 0)
}

function tradeRoutesFor(state: GameState, id: string): TradeRoute[] {
  return (state.city.trade_routes ?? []).filter((route) => route.resource === id && route.action !== 'none')
}

function pushIf(lines: string[], condition: boolean, text: string) {
  if (condition) lines.push(text)
}

function moraleMultiplier(state: GameState): number | null {
  const morale = state.city.morale?.current
  if (morale === undefined) return null
  return morale < 100 ? morale / 100 : 1 + (morale - 100) / 200
}

function modifierHints(state: GameState, id: string): string[] {
  const lines: string[] = []
  const morale = state.city.morale
  const moraleMult = moraleMultiplier(state)
  if (morale && moraleMult !== null && id !== 'Money') {
    lines.push(`士气全局: ${fmt(morale.current)} / ${fmt(morale.cap)} => x${fmt(moraleMult)}`)
    const moraleParts = [
      ['压力', morale.stress],
      ['娱乐', morale.entertain],
      ['VR', morale.vr],
      ['季节', morale.season],
      ['天气', morale.weather],
      ['失业', morale.unemployed],
    ].filter(([, value]) => Math.abs(Number(value)) >= 0.05)
    if (moraleParts.length > 0) {
      lines.push(`士气分项: ${moraleParts.map(([label, value]) => `${label} ${fmtSigned(Number(value))}`).join(' / ')}`)
    }
  }

  if (id === 'Money') {
    const taxRate = state.civic.taxes?.tax_rate ?? 0
    lines.push(`税率: ${fmt(taxRate)}%`)
    if (state.civic.govern?.type) lines.push(`政府: ${state.civic.govern.type}`)
  }

  const geology = state.city.geology?.[id] ?? 0
  if (geology > 0) {
    lines.push(`地质富集: ${id} +${fmt(geology)}`)
  }

  const biome = state.city.biome
  if (['Food', 'Lumber', 'Stone', 'Copper', 'Iron', 'Coal', 'Oil', 'Aluminium'].includes(id) && biome) {
    lines.push(`生态/星球: ${biome}${state.city.ptrait ? ` / ${state.city.ptrait}` : ''}`)
  }

  const flags = [
    ['禁贸易', state.race.no_trade],
    ['禁制造', state.race.no_craft],
    ['禁 CRISPR', state.race.no_crispr],
    ['禁质粒', state.race.no_plasmid],
    ['削弱 mastery', state.race.weak_mastery],
    ['nerfed', state.race.nerfed],
    ['bad genes', state.race.badgenes],
  ].filter(([, enabled]) => enabled)
  if (flags.length > 0) {
    lines.push(`挑战限制: ${flags.map(([label]) => label).join(' / ')}`)
  }

  return lines
}

function powerHints(state: GameState, id: string): string[] {
  const power = state.city.power
  if (!power) return []

  const lines: string[] = []
  const relevantConsumers: Record<string, string[]> = {
    Lumber: ['sawmill'],
    Stone: ['rock_quarry'],
    Copper: ['mine', 'red_mine'],
    Iron: ['mine', 'iron_ship'],
    Coal: ['coal_mine'],
    Cement: ['cement_plant'],
    Knowledge: ['wardenclyffe', 'biolab', 'observatory', 'exotic_lab'],
    Aluminium: ['metal_refinery'],
    Money: ['casino', 'factory'],
    Furs: ['factory'],
    Alloy: ['factory', 'red_factory', 'g_factory'],
    Polymer: ['factory'],
    Nano_Tube: ['factory'],
    Stanene: ['factory'],
    Iridium: ['iridium_mine', 'iridium_ship'],
    Helium_3: ['helium_mine', 'red_factory'],
    Elerium: ['elerium_ship', 'elerium_mine'],
    Adamantite: ['titan_mine', 'mining_droid'],
    Uranium: ['uranium_mine', 'mining_droid', 'coal_power'],
    Neutronium: ['neutronium_mine'],
    Orichalcum: ['orichalcum_mine'],
    Hydrogen: ['electrolysis'],
    Oxygen: ['electrolysis'],
    Oil: ['oil_power', 'space_barracks'],
  }

  const activeConsumers = power.activeConsumers ?? {}
  const activeGenerators = power.activeGenerators ?? {}
  const related = (relevantConsumers[id] ?? [])
    .map((consumerId) => {
      const active = activeConsumers[consumerId] ?? 0
      const configured = countCity(state, consumerId) || countSpace(state, consumerId) || countInterstellar(state, consumerId)
      if (active <= 0 && configured <= 0) return null
      return `${consumerId}: ${fmt(active)}/${fmt(configured)} on`
    })
    .filter((line): line is string => Boolean(line))

  if (related.length > 0 || power.generated > 0 || power.consumed > 0) {
    lines.push(`电网: +${fmt(power.generated)}MW / -${fmt(power.consumed)}MW / ${fmtSigned(power.surplus)}MW`)
  }
  lines.push(...related)

  const fuelGenerators: Record<string, string[]> = {
    Coal: ['coal_power'],
    Oil: ['oil_power'],
    Uranium: ['fission_power'],
    Elerium: ['mass_driver'],
  }
  for (const genId of fuelGenerators[id] ?? []) {
    const active = activeGenerators[genId] ?? 0
    if (active > 0) lines.push(`发电燃料: ${genId} ${fmt(active)} on`)
  }

  return lines
}

function supportHints(state: GameState, id: string): string[] {
  const lines: string[] = []

  const supportedSpace: Record<string, string[]> = {
    Iridium: ['iridium_mine', 'iridium_ship'],
    Helium_3: ['helium_mine'],
    Knowledge: ['observatory', 'exotic_lab'],
    Copper: ['red_mine'],
    Titanium: ['red_mine'],
    Elerium: ['elerium_ship'],
    Iron: ['iron_ship'],
  }

  for (const structureId of supportedSpace[id] ?? []) {
    const struct = state.space[structureId] as { count?: number; on?: number } | undefined
    if (!struct) continue
    const requested = struct.on ?? struct.count ?? 0
    const active = state.city.power?.activeConsumers?.[structureId] ?? requested
    if (requested > 0) lines.push(`支援建筑: ${structureId} ${fmt(active)}/${fmt(requested)} on`)
  }

  for (const providerId of ['moon_base', 'spaceport', 'space_station']) {
    const provider = state.space[providerId] as { count?: number; on?: number; support?: number; s_max?: number } | undefined
    if (!provider) continue
    const support = provider.support ?? 0
    const max = provider.s_max ?? 0
    if (max > 0 && support > 0) {
      lines.push(`支援池 ${providerId}: ${fmt(support)} / ${fmt(max)} 使用`)
    }
  }

  return lines
}

function regionalHints(state: GameState, id: string): string[] {
  const lines: string[] = []
  const spaceSources: Record<string, string[]> = {
    Hydrogen: ['electrolysis'],
    Oxygen: ['electrolysis'],
    Adamantite: ['titan_mine', 'mining_droid'],
    Alloy: ['g_factory'],
    Water: ['water_freighter'],
    Orichalcum: ['orichalcum_mine'],
    Elerium: ['elerium_mine', 'elerium_ship'],
    Uranium: ['uranium_mine', 'mining_droid'],
    Neutronium: ['neutronium_mine'],
    Infernite: ['hell_smelter'],
    Mythril: ['sacred_smelter'],
  }

  for (const structureId of spaceSources[id] ?? []) {
    const count = countSpace(state, structureId)
    if (count > 0) lines.push(`区域建筑: ${structureId} ${fmt(count)} on`)
  }

  const droid = state.interstellar.mining_droid as
    | { on?: number; count?: number; adam?: number; uran?: number; coal?: number; alum?: number }
    | undefined
  const droidAlloc: Record<string, keyof NonNullable<typeof droid>> = {
    Adamantite: 'adam',
    Uranium: 'uran',
    Coal: 'coal',
    Aluminium: 'alum',
  }
  const droidKey = droidAlloc[id]
  if (droid && droidKey && Number(droid[droidKey] ?? 0) > 0) {
    lines.push(`星际采矿机器人: ${fmt(Number(droid[droidKey] ?? 0))}/${fmt(droid.on ?? droid.count ?? 0)} 分配`)
  }

  return lines
}

function sourceHints(state: GameState, id: string): string[] {
  const lines: string[] = []

  switch (id) {
    case 'Food':
      pushIf(lines, workers(state, 'farmer') > 0, `农民: ${workers(state, 'farmer')} 人`)
      pushIf(lines, workers(state, 'hunter') > 0, `猎人: ${workers(state, 'hunter')} 人`)
      pushIf(lines, countCity(state, 'mill') > 0, `磨坊加成: ${countCity(state, 'mill')} 座`)
      break
    case 'Furs':
      pushIf(lines, workers(state, 'hunter') > 0, `猎人副产物: ${workers(state, 'hunter')} 人`)
      break
    case 'Lumber':
      pushIf(lines, workers(state, 'lumberjack') > 0, `伐木工: ${workers(state, 'lumberjack')} 人`)
      pushIf(lines, countCity(state, 'lumber_yard') > 0, `伐木场加成: ${countCity(state, 'lumber_yard')} 座`)
      pushIf(lines, countCity(state, 'sawmill') > 0, `锯木厂加成: ${countCity(state, 'sawmill')} 座`)
      break
    case 'Stone':
      pushIf(lines, workers(state, 'quarry_worker') > 0, `采石工: ${workers(state, 'quarry_worker')} 人`)
      pushIf(lines, countCity(state, 'rock_quarry') > 0, `采石场加成: ${countCity(state, 'rock_quarry')} 座`)
      break
    case 'Copper':
    case 'Iron':
      pushIf(lines, workers(state, 'miner') > 0, `矿工: ${workers(state, 'miner')} 人`)
      pushIf(lines, countCity(state, 'mine') > 0, `矿井加成: ${countCity(state, 'mine')} 座`)
      break
    case 'Coal':
      pushIf(lines, workers(state, 'coal_miner') > 0, `煤矿工: ${workers(state, 'coal_miner')} 人`)
      pushIf(lines, countCity(state, 'coal_mine') > 0, `煤矿加成: ${countCity(state, 'coal_mine')} 座`)
      break
    case 'Cement':
      pushIf(lines, workers(state, 'cement_worker') > 0, `水泥工: ${workers(state, 'cement_worker')} 人`)
      pushIf(lines, countCity(state, 'cement_plant') > 0, `水泥厂加成: ${countCity(state, 'cement_plant')} 座`)
      break
    case 'Knowledge':
      pushIf(lines, workers(state, 'professor') > 0, `教授: ${workers(state, 'professor')} 人`)
      pushIf(lines, workers(state, 'scientist') > 0, `科学家: ${workers(state, 'scientist')} 人`)
      pushIf(lines, countCity(state, 'library') > 0, `图书馆加成: ${countCity(state, 'library')} 座`)
      break
    case 'Money':
      pushIf(lines, workers(state, 'banker') > 0, `银行家: ${workers(state, 'banker')} 人`)
      pushIf(lines, (state.civic.taxes?.tax_rate ?? 0) > 0, `税率: ${state.civic.taxes.tax_rate}%`)
      break
    case 'Faith':
      pushIf(lines, workers(state, 'priest') > 0, `祭司: ${workers(state, 'priest')} 人`)
      pushIf(lines, countCity(state, 'temple') > 0, `神庙: ${countCity(state, 'temple')} 座`)
      break
    case 'Oil':
      pushIf(lines, countCity(state, 'oil_well') > 0, `油井: ${countCity(state, 'oil_well')} 座`)
      break
    case 'Aluminium':
      pushIf(lines, countCity(state, 'metal_refinery') > 0, `金属精炼厂: ${countCity(state, 'metal_refinery')} 座`)
      pushIf(lines, workers(state, 'quarry_worker') > 0, `采石副产物: ${workers(state, 'quarry_worker')} 名采石工`)
      break
  }

  if (['Steel', 'Iron', 'Iridium'].includes(id) && state.city.smelter) {
    const slots = state.city.smelter[id as 'Steel' | 'Iron' | 'Iridium'] ?? 0
    pushIf(lines, slots > 0, `熔炉产线: ${slots} 槽`)
  }

  const craft = state.city.factory as { [key: string]: number } | undefined
  const factoryKey: Record<string, string> = {
    Alloy: 'Alloy',
    Polymer: 'Polymer',
    Nano_Tube: 'Nano',
    Stanene: 'Stanene',
    Furs: 'Furs',
    Money: 'Lux',
  }
  if (craft && factoryKey[id] && craft[factoryKey[id]] > 0) {
    const factory = state.city.factory as { count?: number; on?: number } | undefined
    const powered = state.city.power?.activeConsumers?.factory ?? 0
    lines.push(`工厂产线: ${craft[factoryKey[id]]} 条（${fmt(powered)}/${fmt(factory?.on ?? factory?.count ?? 0)} powered）`)
  }

  if (id === 'Uranium' && (state.city.power?.activeGenerators?.coal_power ?? 0) > 0) {
    lines.push(`煤电灰烬副产物: ${fmt(state.city.power?.activeGenerators?.coal_power ?? 0)} 座煤电`)
  }

  return lines
}

function consumptionHints(state: GameState, id: string): string[] {
  const lines: string[] = []

  if (id === 'Food') {
    const species = state.race.species
    const pop = state.resource[species]?.amount ?? 0
    const soldiers = state.civic.garrison?.workers ?? 0
    pushIf(lines, pop > 0, `人口口粮: ${fmt(pop)} 人`)
    pushIf(lines, soldiers > 0, `士兵口粮: ${fmt(soldiers)} 人`)
  }

  if (id === 'Stone' && workers(state, 'cement_worker') > 0) {
    lines.push(`水泥工消耗: ${workers(state, 'cement_worker')} 人`)
  }

  if (state.city.smelter) {
    const smelter = state.city.smelter
    if (id === 'Lumber' && smelter.Wood > 0) lines.push(`熔炉木材燃料: ${smelter.Wood} 槽`)
    if (id === 'Coal' && smelter.Coal > 0) lines.push(`熔炉煤燃料: ${smelter.Coal} 槽`)
    if (id === 'Oil' && smelter.Oil > 0) lines.push(`熔炉石油燃料: ${smelter.Oil} 槽`)
    if (id === 'Iron' && smelter.Steel > 0) lines.push(`炼钢消耗: ${smelter.Steel} 槽`)
    if (id === 'Coal' && smelter.Steel > 0) lines.push(`炼钢耗煤: ${smelter.Steel} 槽`)
  }

  const factory = state.city.factory as { [key: string]: number } | undefined
  const assembly = Math.min(state.tech.factory ?? 0, 4)
  const factoryOn = state.city.power?.activeConsumers?.factory ?? 0
  const factoryCount = Number(factory?.on ?? factory?.count ?? 0)
  const factoryEff = factoryCount > 0 ? factoryOn / factoryCount : 0
  if (factory) {
    const lineDetail = (label: string, linesCount: number, ratePerLine: number) =>
      `${label}: ${linesCount} 条，基础 ${perSecond(-linesCount * ratePerLine * factoryEff * 0.25)}`
    if (id === 'Copper' && factory.Alloy > 0) lines.push(lineDetail('合金产线耗铜', factory.Alloy, [0.75, 1.12, 1.49, 1.86, 2.23][assembly]))
    if (id === 'Aluminium' && factory.Alloy > 0) lines.push(lineDetail('合金产线耗铝', factory.Alloy, [1, 1.5, 2, 2.5, 3][assembly]))
    if (id === 'Oil' && factory.Polymer > 0) lines.push(lineDetail('聚合物产线耗油', factory.Polymer, [0.18, 0.27, 0.36, 0.45, 0.54][assembly]))
    if (id === 'Lumber' && factory.Polymer > 0) lines.push(lineDetail('聚合物产线耗木材', factory.Polymer, [15, 22, 29, 36, 43][assembly]))
    if (id === 'Coal' && factory.Nano > 0) lines.push(lineDetail('纳米管产线耗煤', factory.Nano, [8, 12, 16, 20, 24][assembly]))
    if (id === 'Neutronium' && factory.Nano > 0) lines.push(lineDetail('纳米管产线耗中子素', factory.Nano, [0.05, 0.075, 0.1, 0.125, 0.15][assembly]))
    if (id === 'Nano_Tube' && factory.Stanene > 0) lines.push(lineDetail('锡烯产线耗纳米管', factory.Stanene, [0.02, 0.03, 0.04, 0.05, 0.06][assembly]))
    if (id === 'Aluminium' && factory.Stanene > 0) lines.push(lineDetail('锡烯产线耗铝', factory.Stanene, [30, 45, 60, 75, 90][assembly]))
    if (id === 'Furs' && factory.Lux > 0) lines.push(lineDetail('奢侈品产线耗毛皮', factory.Lux, [2, 3, 4, 5, 6][assembly]))
    if (id === 'Money' && factory.Furs > 0) lines.push(lineDetail('皮草产线耗资金', factory.Furs, [10, 15, 20, 25, 30][assembly]))
    if (id === 'Polymer' && factory.Furs > 0) lines.push(lineDetail('皮草产线耗聚合物', factory.Furs, [1.5, 2.25, 3, 3.75, 4.5][assembly]))
  }

  if (id === 'Coal' && (state.city.power?.activeGenerators?.coal_power ?? 0) > 0) {
    lines.push(`燃煤发电: ${fmt(state.city.power?.activeGenerators?.coal_power ?? 0)} 座，基础 ${perSecond(-(state.city.power?.activeGenerators?.coal_power ?? 0) * 0.35 * 0.25)}`)
  }
  if (id === 'Oil' && (state.city.power?.activeGenerators?.oil_power ?? 0) > 0) {
    lines.push(`石油发电: ${fmt(state.city.power?.activeGenerators?.oil_power ?? 0)} 座，基础 ${perSecond(-(state.city.power?.activeGenerators?.oil_power ?? 0) * 0.65 * 0.25)}`)
  }
  if (id === 'Uranium' && (state.city.power?.activeGenerators?.fission_power ?? 0) > 0) {
    lines.push(`核电燃料: ${fmt(state.city.power?.activeGenerators?.fission_power ?? 0)} 座，基础 ${perSecond(-(state.city.power?.activeGenerators?.fission_power ?? 0) * 0.1 * 0.25)}`)
  }
  if (id === 'Oil' && countSpace(state, 'space_barracks') > 0) {
    lines.push(`太空军营: ${fmt(countSpace(state, 'space_barracks'))} on，基础 ${perSecond(-countSpace(state, 'space_barracks') * 2 * 0.25)}`)
  }
  if (id === 'Helium_3' && (state.city.power?.activeConsumers?.red_factory ?? 0) > 0) {
    lines.push(`红色工厂供能: ${fmt(state.city.power?.activeConsumers?.red_factory ?? 0)} 座，基础 ${perSecond(-(state.city.power?.activeConsumers?.red_factory ?? 0) * 0.25)}`)
  }

  return lines
}

function breakdownLines(res: ResourceSnapshot): string[] {
  const breakdown = res.breakdown
  if (!breakdown || breakdown.entries.length === 0) return []

  const lines: string[] = []
  const byKind = {
    source: breakdown.entries.filter((entry) => entry.kind === 'source'),
    consume: breakdown.entries.filter((entry) => entry.kind === 'consume'),
    modifier: breakdown.entries.filter((entry) => entry.kind === 'modifier'),
    system: breakdown.entries.filter((entry) => entry.kind === 'system'),
  }

  if (byKind.source.length > 0) {
    lines.push('—— 真实来源 ——')
    lines.push(...byKind.source.map((entry) => `${entry.label}: ${perSecond(entry.amount)}${entry.detail ? ` (${entry.detail})` : ''}`))
  }
  if (byKind.consume.length > 0) {
    lines.push('—— 真实消耗 ——')
    lines.push(...byKind.consume.map((entry) => `${entry.label}: ${perSecond(entry.amount)}${entry.detail ? ` (${entry.detail})` : ''}`))
  }
  if (byKind.modifier.length > 0) {
    lines.push('—— 真实修正 ——')
    lines.push(...byKind.modifier.map((entry) => `${entry.label}: ${perSecond(entry.amount)}${entry.detail ? ` (${entry.detail})` : ''}`))
  }
  if (byKind.system.length > 0) {
    lines.push('—— 系统 ——')
    lines.push(...byKind.system.map((entry) => `${entry.label}: ${perSecond(entry.amount)}${entry.detail ? ` (${entry.detail})` : ''}`))
  }

  lines.push('—— 合计 ——')
  lines.push(`总来源: ${perSecond(breakdown.grossSource)}`)
  lines.push(`总消耗: ${perSecond(breakdown.grossConsume)}`)
  if (breakdown.truncated && Math.abs(breakdown.truncated) > 0.005) {
    lines.push(`截断: ${perSecond(breakdown.truncated)}`)
  }

  return lines
}

export function buildResourceTooltip(state: GameState, res: ResourceSnapshot): string {
  const effectiveTickRate = res.max > 0 && res.amount >= res.max && res.diff > 0 ? 0 : res.diff
  const lines = [
    `${res.name || getResourceName(res.id)} (${res.id})`,
    `数量: ${fmt(res.amount)}${res.max > 0 ? ` / ${fmt(res.max)}` : ' / 无上限'}`,
    `净速率: ${fmtSigned(effectiveTickRate * TICKS_PER_SECOND)}/s`,
  ]

  const trueBreakdown = breakdownLines(res)
  if (trueBreakdown.length > 0) {
    lines.push(...trueBreakdown)
  } else if (res.max > 0 && res.amount >= res.max && res.diff > 0) {
    lines.push(`满仓截断: +${fmt(res.diff * TICKS_PER_SECOND)}/s 未计入`)
  }

  if (trueBreakdown.length > 0) {
    if ((res.crates ?? 0) > 0 || (res.containers ?? 0) > 0) {
      lines.push('—— 存储 ——')
      pushIf(lines, (res.crates ?? 0) > 0, `板条箱: ${res.crates}`)
      pushIf(lines, (res.containers ?? 0) > 0, `集装箱: ${res.containers}`)
    }
    return lines.join('\n')
  }

  const source = sourceHints(state, res.id)
  const consume = consumptionHints(state, res.id)
  const modifiers = modifierHints(state, res.id)
  const power = powerHints(state, res.id)
  const support = supportHints(state, res.id)
  const regional = regionalHints(state, res.id)
  const routes = tradeRoutesFor(state, res.id)

  if (source.length > 0) {
    lines.push('—— 来源 ——')
    lines.push(...source)
  }
  if (consume.length > 0) {
    lines.push('—— 消耗 ——')
    lines.push(...consume)
  }
  if (modifiers.length > 0) {
    lines.push('—— 修正 ——')
    lines.push(...modifiers)
  }
  if (power.length > 0) {
    lines.push('—— 电力 ——')
    lines.push(...power)
  }
  if (support.length > 0) {
    lines.push('—— 支援 ——')
    lines.push(...support)
  }
  if (regional.length > 0) {
    lines.push('—— 区域 ——')
    lines.push(...regional)
  }
  if (routes.length > 0) {
    lines.push('—— 自动贸易 ——')
    lines.push(...routes.map((route) => `${route.action === 'buy' ? '买入' : '卖出'} ${route.qty}/tick`))
  }
  if ((res.crates ?? 0) > 0 || (res.containers ?? 0) > 0) {
    lines.push('—— 存储 ——')
    pushIf(lines, (res.crates ?? 0) > 0, `板条箱: ${res.crates}`)
    pushIf(lines, (res.containers ?? 0) > 0, `集装箱: ${res.containers}`)
  }

  return lines.join('\n')
}
