/**
 * 太空建筑（Phase 1C）
 *
 * 对标 legacy/src/space.js。
 * 当前 sprint 覆盖：
 *   - spc_home: satellite / propellant_depot / gps / nav_beacon
 *   - spc_moon: moon_base / iridium_mine / helium_mine / observatory
 *   - spc_red: spaceport / living_quarters / garage / red_mine / fabrication
 *   - spc_red extension: red_tower / red_factory / biodome / exotic_lab / ziggurat / space_barracks
 *   - spc_hell: geothermal / swarm_plant
 *   - spc_sun: swarm_control / swarm_satellite
 *   - spc_gas: gas_mining / gas_storage
 *   - spc_gas_moon: outpost / oil_extractor
 *   - spc_belt: space_station / elerium_ship / iridium_ship / iron_ship
 *   - spc_dwarf: elerium_contain / e_reactor
 *
 * 所有成本与加成系数逐行对标 legacy；EvoZen 当前不执行 fuel_adjust / spatialReasoning
 * （truepath / world_control / 种族修饰尚未进入当前 scope）。
 */

import type { GameState } from '@evozen/shared-types';

export type SpaceCostFunction = (state: GameState, count: number) => number;

/** 支援池标识。单独抽象方便未来新增 belt/alpha 等。 */
export type SupportPool = 'moon' | 'red' | 'belt';

export interface SpaceStructureDefinition {
  /** 建筑 ID，与 state.space[id] 对应 */
  id: string;
  /** 所属区域（spc_home / spc_moon / spc_red / ...） */
  region: string;
  /** 中文名 */
  name: string;
  /** 描述 */
  description: string;
  /** 前置科技等级要求（tech[key] >= value） */
  reqs: Record<string, number>;
  /**
   * 前置太空建筑数量要求（state.space[key].count >= value）。
   * 对标 legacy 中 `reqs: { satellite: 1 }` 这类"需要已建造 N 座"的门槛。
   */
  spaceReqs?: Record<string, number>;
  /** 被以下种族特性阻止建造（对标 legacy not_trait） */
  notTrait?: string[];
  /** 成本函数，按当前已建数量返回该资源本次建造需要的数量 */
  costs: Record<string, SpaceCostFunction>;
  /** 简要效果（UI 文案） */
  effect: string;
  /**
   * 供电需求（MW/座）。建造此建筑后 `state.space[id].on` 会参与电力分配。
   * 对标 legacy action.powered() 返回的基础值（不含 powerCostMod 修饰）。
   */
  powerCost?: number;
  /**
   * 本建筑对某支援池的 净支援贡献。正数 = 提供者（如 moon_base 每座 +2 support），
   * 负数 = 消耗者（如 iridium_mine 每座 -1 support）。
   * 与 legacy action.support() 的符号约定完全一致。
   */
  support?: { pool: SupportPool; amount: number };
  /**
   * 作为"区域供给者"每 tick 需要消耗的燃料（支援燃料）。
   * 对标 legacy action.support_fuel()。
   * 例：moon_base 每座 on 后每 tick 消耗 2 Oil。
   */
  supportFuel?: { resource: string; amountPerTick: number };
}

/**
 * 对标 legacy/src/functions.js `spaceCostMultiplier(id, offset, base, mult)`：
 *   cost = round(base * mult^count)
 *
 * 当前不处理 offset（队列预扣尚未接入太空），与 city 建筑的 scaleCost 实现保持一致。
 */
function spaceCost(base: number, mult: number): SpaceCostFunction {
  return (_state, count) => Math.round(base * Math.pow(mult, count));
}

export const SPACE_STRUCTURES: SpaceStructureDefinition[] = [
  // ==================== spc_home: 母星轨道区 ====================
  {
    id: 'satellite',
    region: 'spc_home',
    name: '人造卫星',
    description: '在近地轨道部署科研卫星，扩大知识容量并提升科研效率。',
    // 对标 legacy/src/space.js L62: reqs: { space: 2 }
    reqs: { space: 2 },
    // 对标 legacy/src/space.js L63-68
    costs: {
      Money: spaceCost(72000, 1.22),
      Knowledge: spaceCost(28000, 1.22),
      Oil: spaceCost(3200, 1.22),
      Alloy: spaceCost(8000, 1.22),
    },
    effect: '知识上限 +750；沃登克里夫知识上限 +4%/座；科学家效率 +1%/座。',
  },
  {
    id: 'propellant_depot',
    region: 'spc_home',
    name: '推进剂储备站',
    description: '在轨道储存液体燃料，扩大石油与氦-3 存储容量。',
    // 对标 legacy/src/space.js L142
    reqs: { space_explore: 1 },
    // 对标 legacy/src/space.js L143-147
    costs: {
      Money: spaceCost(55000, 1.35),
      Aluminium: spaceCost(22000, 1.35),
      Oil: spaceCost(5500, 1.35),
    },
    effect: '石油上限 +1250；当氦-3 已解锁时，氦-3 上限 +1000。',
  },
  {
    id: 'gps',
    region: 'spc_home',
    name: 'GPS 卫星网',
    description: '部署导航卫星群；达到 4 座后开始提供贸易路线容量加成。',
    // 对标 legacy/src/space.js L106-107
    reqs: {},
    spaceReqs: { satellite: 1 },
    notTrait: ['terrifying'],
    // 对标 legacy/src/space.js L108-113
    costs: {
      Money: spaceCost(75000, 1.18),
      Knowledge: spaceCost(50000, 1.18),
      Copper: spaceCost(6500, 1.18),
      Oil: spaceCost(3500, 1.18),
      Titanium: spaceCost(8000, 1.18),
    },
    effect: '当 GPS 达到 4 座后，每座额外提供 +2 条贸易路线。',
  },
  {
    id: 'nav_beacon',
    region: 'spc_home',
    name: '导航信标',
    description: '在近地轨道部署导航信标，为月球支援点提供额外容量。',
    // 对标 legacy/src/space.js L178: reqs: { luna: 2 }
    reqs: { luna: 2 },
    // 对标 legacy/src/space.js L179-185
    costs: {
      Money: spaceCost(75000, 1.32),
      Copper: spaceCost(38000, 1.32),
      Aluminium: spaceCost(44000, 1.32),
      Oil: spaceCost(12500, 1.32),
      Iridium: spaceCost(1200, 1.32),
    },
    effect: '每座需要 2MW 电力；每座 on 后月球支援容量 +1。',
    // 对标 legacy/src/space.js L186: powered(){ return powerCostMod(2); }
    powerCost: 2,
    // 对标 legacy/src/main.js L2306: 如果 luna>=2，p_on['nav_beacon'] 每座向 spc_moon.s_max +1
    // （EvoZen 将其建模为：nav_beacon 每座 on 对 moon 池 +1 支援）
    support: { pool: 'moon', amount: 1 },
  },

  // ==================== spc_moon: 月球 ====================
  {
    id: 'moon_base',
    region: 'spc_moon',
    name: '月面基地',
    description: '在月表建立可持续前哨，为月面采矿与观测提供支援能力。',
    // 对标 legacy/src/space.js L254: reqs: { space: 3 }
    reqs: { space: 3 },
    // 对标 legacy/src/space.js L255-260
    costs: {
      Money: spaceCost(22000, 1.32),
      Cement: spaceCost(18000, 1.32),
      Alloy: spaceCost(7800, 1.32),
      Polymer: spaceCost(12500, 1.32),
    },
    effect: '每座需要 4MW 电力与 2 石油/tick；铱上限 +500；每座 on 提供 2 月球支援。',
    // 对标 legacy/src/space.js L268: powered(){ return powerCostMod(4); }
    powerCost: 4,
    // 对标 legacy/src/space.js L266: support(){ return 2; }
    support: { pool: 'moon', amount: 2 },
    // 对标 legacy/src/space.js L267: support_fuel(){ return { r: 'Oil', a: 2 }; }
    supportFuel: { resource: 'Oil', amountPerTick: 2 },
  },
  {
    id: 'iridium_mine',
    region: 'spc_moon',
    name: '月面铱矿',
    description: '在月表开采稀有金属铱，向月球殖民地输送资源。',
    // 对标 legacy/src/space.js L317
    reqs: { space: 3, luna: 1 },
    // 对标 legacy/src/space.js L318-322
    costs: {
      Money: spaceCost(42000, 1.35),
      Lumber: spaceCost(9000, 1.35),
      Titanium: spaceCost(17500, 1.35),
    },
    effect: '每座消耗 1 月球支援，产出 0.035 铱/tick。',
    // 对标 legacy/src/space.js L340: support(){ return -1; }
    support: { pool: 'moon', amount: -1 },
  },
  {
    id: 'helium_mine',
    region: 'spc_moon',
    name: '氦-3 采集站',
    description: '从月壤中采集氦-3，为未来的聚变燃料储备奠基。',
    // 对标 legacy/src/space.js L366
    reqs: { space: 3, luna: 1 },
    // 对标 legacy/src/space.js L367-371
    costs: {
      Money: spaceCost(38000, 1.35),
      Aluminium: spaceCost(9000, 1.35),
      Steel: spaceCost(17500, 1.35),
    },
    effect: '每座消耗 1 月球支援，产出 0.18 氦-3/tick；氦-3 上限 +100。',
    // 对标 legacy/src/space.js L388: support(){ return -1; }
    support: { pool: 'moon', amount: -1 },
  },
  {
    id: 'observatory',
    region: 'spc_moon',
    name: '月球观测站',
    description: '利用月表无大气干扰的条件建立深空观测站，扩张知识容量并补强研究链。',
    // 对标 legacy/src/space.js L411
    reqs: { science: 9, luna: 1 },
    // 对标 legacy/src/space.js L412-416
    costs: {
      Money: spaceCost(200000, 1.28),
      Knowledge: spaceCost(69000, 1.28),
      Stone: spaceCost(125000, 1.28),
      Iron: spaceCost(65000, 1.28),
      Iridium: spaceCost(1250, 1.28),
    },
    effect: '每座消耗 1 月球支援；知识上限 +5000，并提高大学知识上限贡献。',
    // 对标 legacy/src/space.js L429-430
    support: { pool: 'moon', amount: -1 },
  },
  {
    id: 'spaceport',
    region: 'spc_red',
    name: '太空港',
    description: '为红色行星建立支援枢纽，承担前线物流、停靠和后续殖民扩张入口。',
    // 对标 legacy/src/space.js L494
    reqs: { space: 4 },
    // 对标 legacy/src/space.js L496-499
    costs: {
      Money: spaceCost(47500, 1.32),
      Iridium: spaceCost(1750, 1.32),
      Mythril: spaceCost(25, 1.32),
      Titanium: spaceCost(22500, 1.32),
    },
    effect: '每座需要 5MW 电力与 1.25 氦-3/tick；每座 on 提供 3 红星支援，并建立 mars:1 入口。',
    // 对标 legacy/src/space.js L514
    powerCost: 5,
    // 对标 legacy/src/space.js L510-513（baseline 3；特殊种族修饰后续补）
    support: { pool: 'red', amount: 3 },
    // 对标 legacy/src/space.js L515
    supportFuel: { resource: 'Helium_3', amountPerTick: 1.25 },
  },
  {
    id: 'red_tower',
    region: 'spc_red',
    name: '火星高塔',
    description: '在红色行星上建立稳定的深空通信与观测塔，进一步扩张前线支援能力。',
    // 对标 legacy/src/space.js L554
    reqs: { mars: 3 },
    // 对标 legacy/src/space.js L556-559
    costs: {
      Money: spaceCost(225000, 1.28),
      Iron: spaceCost(22000, 1.28),
      Cement: spaceCost(15000, 1.28),
      Alloy: spaceCost(8000, 1.28),
    },
    effect: '每座需要 2MW 电力；每座 on 后额外提供 1 红星支援。',
    // 对标 legacy/src/space.js L565
    powerCost: 2,
    // 对标 legacy/src/space.js L569：baseline support = 1
    support: { pool: 'red', amount: 1 },
  },
  {
    id: 'living_quarters',
    region: 'spc_red',
    name: '火星居住区',
    description: '在红色行星建立居住区，每座获得支援即可容纳殖民人口。',
    // 对标 legacy/src/space.js L721
    reqs: { mars: 1 },
    // 对标 legacy/src/space.js L722-727（house_adjust baseline = 1.0）
    costs: {
      Money: spaceCost(38000, 1.28),
      Steel: spaceCost(15000, 1.28),
      Polymer: spaceCost(9500, 1.28),
    },
    effect: '每座消耗 1 红星支援；获得支援后增加人口上限与行星居民上限。',
    // 对标 legacy/src/space.js L738-739：support -1，powered 0
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'vr_center',
    region: 'spc_red',
    name: 'VR 中心',
    description: '在火星殖民地部署沉浸式娱乐设施，稳定前线居民情绪并提高士气承受上限。',
    // 对标 legacy/src/space.js L813
    reqs: { mars: 1, broadcast: 3 },
    // 对标 legacy/src/space.js L814-817
    costs: {
      Money: spaceCost(380000, 1.25),
      Copper: spaceCost(55000, 1.25),
      Stanene: spaceCost(100000, 1.25),
      Soul_Gem: spaceCost(1, 1.25),
    },
    effect: '每座消耗 1 红星支援；在非 joyless 状态下提供 +1 士气，并使士气上限 +2。',
    // 对标 legacy/src/space.js L839-840：support -1，powered 0
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'garage',
    region: 'spc_red',
    name: '火星车库',
    description: '在火星地表建立加固仓库，扩大关键物资的仓储容量。',
    // 对标 legacy/src/space.js L851
    reqs: { mars: 1 },
    // 对标 legacy/src/space.js L852-857
    costs: {
      Money: spaceCost(75000, 1.28),
      Iron: spaceCost(12000, 1.28),
      Brick: spaceCost(3000, 1.28),
      Sheet_Metal: spaceCost(1500, 1.28),
    },
    // 对标 legacy/src/space.js L924-943 的 effect：non-cataclysm / baseline multiplier=1
    //   Copper +6500, Iron +5500, Cement +6000, Steel +4500, Titanium +3500, Containers +20
    effect: '每座 +20 集装箱上限；并提升 铜 / 铁 / 水泥 / 钢 / 钛 的仓储上限。',
    // garage 不需要电力也不占支援（legacy 无 support / powered 字段）。
  },
  {
    id: 'red_mine',
    region: 'spc_red',
    name: '火星矿场',
    description: '在红色行星表面开采铜与钛，为前线供给关键金属。',
    // 对标 legacy/src/space.js L983
    reqs: { mars: 1 },
    // 对标 legacy/src/space.js L984-988
    costs: {
      Money: spaceCost(50000, 1.32),
      Lumber: spaceCost(65000, 1.32),
      Iron: spaceCost(33000, 1.32),
    },
    // 对标 legacy/src/prod.js L93-122 + main.js L5733-5740：
    // 产出 = support_on['red_mine'] * colonist.workers * baseline
    effect: '每座消耗 1 红星支援；获得支援后按行星居民数量产出铜与钛。',
    // 对标 legacy/src/space.js L1011-1012：support -1，powered 0
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'fabrication',
    region: 'spc_red',
    name: '火星工坊',
    description: '在红色行星上建立前哨制造基地，为殖民者提供工匠岗位。',
    // 对标 legacy/src/space.js L1034
    reqs: { mars: 1 },
    // 对标 legacy/src/space.js L1035-1040
    costs: {
      Money: spaceCost(90000, 1.32),
      Copper: spaceCost(25000, 1.32),
      Cement: spaceCost(12000, 1.32),
      Wrought_Iron: spaceCost(1200, 1.32),
    },
    // 对标 legacy/src/main.js L9769-9774 + resources.js L329-334：
    // 每座 support_on 的 fabrication 使 craftsman max +1，并按 colonist.workers 提升 crafting 速率。
    effect: '每座消耗 1 红星支援；获得支援后工匠岗位上限 +1，并提升制造效率。',
    // 对标 legacy/src/space.js L1050-1051：support -1，powered 0
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'red_factory',
    region: 'spc_red',
    name: '太空工厂',
    description: '把部分高端工业产线转移到火星，直接扩展现有工厂的可用产线。',
    // 对标 legacy/src/space.js L1074
    reqs: { mars: 4 },
    // 对标 legacy/src/space.js L1075-1078
    costs: {
      Money: spaceCost(75000, 1.32),
      Brick: spaceCost(10000, 1.32),
      Coal: spaceCost(7500, 1.32),
      Mythril: spaceCost(50, 1.32),
    },
    effect: '每座需要 3MW 电力与 1 氦-3/tick；扩展工厂产线容量。',
    // 对标 legacy/src/space.js L1091
    powerCost: 3,
  },
  {
    id: 'biodome',
    region: 'spc_red',
    name: '生物穹顶',
    description: '在火星前线建立可持续生态穹顶，为殖民地提供食物与额外居住收益。',
    // 对标 legacy/src/space.js L1142
    reqs: { mars: 2 },
    // 对标 legacy/src/space.js L1144-1147（忽略 deconstructor 分支 Nanite）
    costs: {
      Money: spaceCost(45000, 1.28),
      Lumber: spaceCost(65000, 1.28),
      Brick: spaceCost(1000, 1.28),
    },
    effect: '每座消耗 1 红星支援；提供额外食物产出，并提高居住区的人口上限收益。',
    // 对标 legacy/src/space.js L1166-1168
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'exotic_lab',
    region: 'spc_red',
    name: '异星实验室',
    description: '在火星建立高端实验设施，扩大知识上限并为后续异星资源研究预留入口。',
    // 对标 legacy/src/space.js L1242
    reqs: { mars: 5 },
    // 对标 legacy/src/space.js L1244-1247
    costs: {
      Money: spaceCost(750000, 1.28),
      Steel: spaceCost(100000, 1.28),
      Mythril: spaceCost(1000, 1.28),
      Elerium: (_state, count) => Math.max(0, spaceCost(20, 1.28)(_state, count) - 4),
    },
    effect: '每座消耗 1 红星支援；提高知识上限，并为后续异星资源链预留接口。',
    // 对标 legacy/src/space.js L1281-1283
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'ziggurat',
    region: 'spc_red',
    name: '古代神殿',
    description: '在火星地表复建远古神殿，以殖民者的信仰力量换取全局产出加成。',
    // 对标 legacy/src/space.js L1309: reqs: { theology: 4 }
    reqs: { theology: 4 },
    // 对标 legacy/src/space.js L1310-1314
    costs: {
      Money: spaceCost(600000, 1.28),
      Stone: spaceCost(250000, 1.28),
      Aluminium: spaceCost(70000, 1.28),
      Mythril: spaceCost(250, 1.28),
    },
    effect: '每座按殖民者人数与神殿数量提供全局资源产出乘数加成。',
    // ziggurat 无电力、无支援（legacy struct: { count: 0 }）。
  },
  {
    id: 'space_barracks',
    region: 'spc_red',
    name: '太空军营',
    description: '在火星前线驻扎太空陆战队，扩大驻军上限但消耗石油与食物。',
    // 对标 legacy/src/space.js L1376: reqs: { marines: 1 }
    reqs: { marines: 1 },
    // 对标 legacy/src/space.js L1377-1381（忽略 Horseshoe）
    costs: {
      Money: spaceCost(350000, 1.28),
      Alloy: spaceCost(65000, 1.28),
      Iridium: spaceCost(22500, 1.28),
      Wrought_Iron: spaceCost(12500, 1.28),
    },
    effect: '每座提供额外驻军上限，但每座消耗 2 石油/tick 与 10 食物/tick。',
    // 对标 legacy/src/space.js L1398: powered(){ return 0; }
    // space_barracks 无电力、无 support 字段。on 由油耗逐座裁剪（legacy main.js L2393-2403）。
  },

  // ===== spc_hell =====
  // 对标 legacy/src/space.js L1493-1660
  {
    id: 'geothermal',
    region: 'spc_hell',
    name: '地热发电站',
    description: '利用高温地狱行星的地热能产生电力。',
    reqs: { hell: 1 },
    costs: {
      Money: spaceCost(38000, 1.35),
      Steel: spaceCost(15000, 1.35),
      Polymer: spaceCost(9500, 1.35),
    },
    effect: '每座产出 8 电力，消耗 0.5 氦-3/tick。',
    powerCost: -8,
    supportFuel: { resource: 'Helium_3', amountPerTick: 0.5 },
  },
  {
    id: 'swarm_plant',
    region: 'spc_hell',
    name: '虫群工厂',
    description: '在地狱行星生产虫群卫星组件，降低卫星成本。',
    // 对标 legacy/src/space.js L1629: reqs: { solar: 4, hell: 1 }
    reqs: { solar: 4, hell: 1 },
    costs: {
      Money: spaceCost(75000, 1.28),
      Iron: spaceCost(65000, 1.28),
      Neutronium: spaceCost(75, 1.28),
      Brick: spaceCost(2500, 1.28),
      Mythril: spaceCost(100, 1.28),
    },
    effect: '每座降低虫群卫星建造成本 6%。',
    // swarm_plant 无电力、无支援。
  },

  // ===== spc_sun =====
  // 对标 legacy/src/space.js L1700-1772
  {
    id: 'swarm_control',
    region: 'spc_sun',
    name: '虫群控制站',
    description: '在恒星轨道部署控制中心，提供虫群支援池。',
    reqs: { solar: 3 },
    costs: {
      Money: spaceCost(100000, 1.3),
      Knowledge: spaceCost(60000, 1.3),
      Alloy: spaceCost(7500, 1.3),
      Helium_3: spaceCost(2000, 1.3),
      Mythril: spaceCost(250, 1.3),
    },
    effect: '每座提供 10 虫群支援上限（swarm >= 2 时提升至 12）。',
    // swarm_control 是 spc_sun 的支援池提供者，不消耗电力。
  },
  {
    id: 'swarm_satellite',
    region: 'spc_sun',
    name: '虫群卫星',
    description: '在恒星轨道部署太阳能卫星，提供全局电力。',
    reqs: { solar: 3 },
    costs: {
      Money: spaceCost(5000, 1.1),
      Copper: spaceCost(2500, 1.1),
      Iridium: spaceCost(150, 1.1),
      Helium_3: spaceCost(50, 1.1),
    },
    effect: '每座产出 0.35 电力，消耗 1 虫群支援。',
    // 无 powerCost（产电），支援由 swarm_control 管理。
  },

  // ===== spc_gas =====
  // 对标 legacy/src/space.js L1863-1928
  {
    id: 'gas_mining',
    region: 'spc_gas',
    name: '气体采集站',
    description: '在气态巨行星大气中采集氦-3。',
    reqs: { gas_giant: 1 },
    costs: {
      Money: spaceCost(250000, 1.32),
      Uranium: spaceCost(500, 1.32),
      Alloy: spaceCost(10000, 1.32),
      Helium_3: spaceCost(2500, 1.32),
      Mythril: spaceCost(25, 1.32),
    },
    effect: '每座每 tick 产出氦-3，消耗 2 电力。',
    powerCost: 2,
  },
  {
    id: 'gas_storage',
    region: 'spc_gas',
    name: '轨道储存站',
    description: '在气态巨行星轨道建造资源存储设施。',
    reqs: { gas_giant: 1 },
    costs: {
      Money: spaceCost(125000, 1.32),
      Iridium: spaceCost(3000, 1.32),
      Sheet_Metal: spaceCost(2000, 1.32),
      Helium_3: spaceCost(1000, 1.32),
    },
    effect: '每座增加 Oil +3500, Helium_3 +2500, Uranium +1000 上限。',
    // 纯存储建筑，无电力。
  },

  // ===== spc_gas_moon =====
  // 对标 legacy/src/space.js L2007-2123
  {
    id: 'outpost',
    region: 'spc_gas_moon',
    name: '前哨站',
    description: '在气体卫星建立中子素采集前哨。',
    reqs: { gas_moon: 1 },
    costs: {
      Money: spaceCost(666000, 1.3),
      Titanium: spaceCost(18000, 1.3),
      Iridium: spaceCost(2500, 1.3),
      Helium_3: spaceCost(6000, 1.3),
      Mythril: spaceCost(300, 1.3),
    },
    effect: '每座产出中子素，提供 +500 中子素上限。消耗 3 电力 + 2 Oil/tick。',
    powerCost: 3,
  },
  {
    id: 'oil_extractor',
    region: 'spc_gas_moon',
    name: '石油提取器',
    description: '从气态卫星的碳氢化合物湖泊中提取石油。',
    reqs: { gas_moon: 2 },
    costs: {
      Money: spaceCost(666000, 1.3),
      Polymer: spaceCost(7500, 1.3),
      Helium_3: spaceCost(2500, 1.3),
      Wrought_Iron: spaceCost(5000, 1.3),
    },
    effect: '每座每 tick 产出石油。消耗 1 电力。',
    powerCost: 1,
  },

  // ===== spc_belt =====
  // 对标 legacy/src/space.js L2165-2335
  {
    id: 'space_station',
    region: 'spc_belt',
    name: '太空站',
    description: '在小行星带建立空间站，提供矿工岗位与支援池。',
    reqs: { asteroid: 2 },
    costs: {
      Money: spaceCost(250000, 1.3),
      Iron: spaceCost(85000, 1.3),
      Polymer: spaceCost(18000, 1.3),
      Iridium: spaceCost(2800, 1.28),
      Helium_3: spaceCost(2000, 1.3),
      Mythril: spaceCost(75, 1.25),
    },
    effect: '每座提供 3 太空矿工岗位 + 5 Elerium 上限(asteroid>=5)。消耗 3 电力 + 2.5 He3 + 10 Food/tick。',
    powerCost: 3,
    // space_station 是 spc_belt 的支援池提供者（support: 'belt'）。
    // 但它自身也是消费者（电力 + 燃料 + 食物），与 moon_base/spaceport 类似。
  },
  {
    id: 'elerium_ship',
    region: 'spc_belt',
    name: '超铀采矿船',
    description: '在小行星带采集超铀元素。',
    reqs: { asteroid: 5 },
    costs: {
      Money: spaceCost(500000, 1.3),
      Uranium: spaceCost(2500, 1.3),
      Titanium: spaceCost(10000, 1.3),
      Mythril: spaceCost(500, 1.3),
      Helium_3: spaceCost(5000, 1.3),
    },
    effect: '每座产出 Elerium。消耗 2 小行星带支援。',
    support: { pool: 'belt', amount: -2 },
  },
  {
    id: 'iridium_ship',
    region: 'spc_belt',
    name: '铱矿采矿船',
    description: '在小行星带采集铱矿。',
    reqs: { asteroid: 3 },
    costs: {
      Money: spaceCost(120000, 1.3),
      Uranium: spaceCost(1000, 1.3),
      Alloy: spaceCost(48000, 1.3),
      Iridium: spaceCost(2800, 1.3),
      Helium_3: spaceCost(1800, 1.3),
    },
    effect: '每座产出 Iridium。消耗 1 小行星带支援。',
    support: { pool: 'belt', amount: -1 },
  },
  {
    id: 'iron_ship',
    region: 'spc_belt',
    name: '铁矿采矿船',
    description: '在小行星带采集铁矿。',
    reqs: { asteroid: 3 },
    costs: {
      Money: spaceCost(80000, 1.3),
      Steel: spaceCost(42000, 1.3),
      Aluminium: spaceCost(38000, 1.3),
      Polymer: spaceCost(16000, 1.3),
      Helium_3: spaceCost(1200, 1.3),
    },
    effect: '每座产出 Iron。消耗 1 小行星带支援。',
    support: { pool: 'belt', amount: -1 },
  },

  // ===== spc_dwarf =====
  // 对标 legacy/src/space.js L2374-2441
  {
    id: 'elerium_contain',
    region: 'spc_dwarf',
    name: '超铀容器',
    description: '在矮行星建造高级超铀存储容器。',
    reqs: { dwarf: 1 },
    costs: {
      Money: spaceCost(800000, 1.28),
      Cement: spaceCost(120000, 1.28),
      Iridium: spaceCost(50000, 1.28),
      Neutronium: spaceCost(250, 1.28),
    },
    effect: '每座增加 Elerium +100 上限。消耗 6 电力。',
    powerCost: 6,
  },
  {
    id: 'e_reactor',
    region: 'spc_dwarf',
    name: '超铀反应堆',
    description: '利用超铀元素产生大量电力。',
    reqs: { elerium: 2 },
    costs: {
      Money: spaceCost(1250000, 1.28),
      Steel: spaceCost(350000, 1.28),
      Neutronium: spaceCost(1250, 1.28),
      Mythril: spaceCost(2500, 1.28),
    },
    effect: '每座产出 25 电力，消耗 0.05 Elerium/tick。',
    powerCost: -25,
    supportFuel: { resource: 'Elerium', amountPerTick: 0.05 },
  },
];

// ============================================================
// 查询与计算
// ============================================================

function getSpaceCount(state: GameState, id: string): number {
  return (state.space[id] as { count?: number } | undefined)?.count ?? 0;
}

function getSpaceOn(state: GameState, id: string): number {
  const struct = state.space[id] as { count?: number; on?: number } | undefined;
  if (!struct) return 0;
  // 若 on 未定义但 count 存在，默认视为全部开启（与 city 的 on ?? count 惯例一致）
  return struct.on ?? struct.count ?? 0;
}

/** 按支援池过滤的供给者/消耗者列表（用于支援解算）。 */
export function getSpaceSupplyDefs(pool: SupportPool): SpaceStructureDefinition[] {
  return SPACE_STRUCTURES.filter((d) => d.support?.pool === pool && d.support.amount > 0);
}
export function getSpaceConsumerDefs(pool: SupportPool): SpaceStructureDefinition[] {
  return SPACE_STRUCTURES.filter((d) => d.support?.pool === pool && d.support.amount < 0);
}

export function getSpaceBuildCost(state: GameState, id: string): Record<string, number> {
  const def = SPACE_STRUCTURES.find((s) => s.id === id);
  if (!def) return {};
  const count = getSpaceCount(state, id);
  const costs: Record<string, number> = {};
  for (const [resId, fn] of Object.entries(def.costs)) {
    costs[resId] = fn(state, count);
  }
  return costs;
}

export function canBuildSpaceStructure(state: GameState, id: string): boolean {
  const def = SPACE_STRUCTURES.find((s) => s.id === id);
  if (!def) return false;

  for (const [reqKey, reqLvl] of Object.entries(def.reqs)) {
    if ((state.tech[reqKey] ?? 0) < reqLvl) return false;
  }

  if (def.spaceReqs) {
    for (const [spaceId, minCount] of Object.entries(def.spaceReqs)) {
      if (getSpaceCount(state, spaceId) < minCount) return false;
    }
  }

  if (def.notTrait) {
    for (const trait of def.notTrait) {
      if ((state.race as Record<string, unknown>)[trait] !== undefined) return false;
    }
  }

  const costs = getSpaceBuildCost(state, id);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

// ============================================================
// derived-state / tick 使用的加成查询
// ============================================================

export function getSatelliteCount(state: GameState): number {
  return getSpaceCount(state, 'satellite');
}

/**
 * 卫星对沃登克里夫知识上限的乘数（对标 legacy main.js L9329-9331）：
 *   gain *= 1 + (satellite.count * 0.04)
 */
export function getSatelliteWardenclyffeMultiplier(state: GameState): number {
  return 1 + getSatelliteCount(state) * 0.04;
}

/**
 * 卫星对科学家 impact 的乘数（对标 legacy main.js L4197-4199）：
 *   scientist_base *= 1 + (satellite.count * 0.01)
 */
export function getSatelliteScientistImpactMultiplier(state: GameState): number {
  return 1 + getSatelliteCount(state) * 0.01;
}

/**
 * 卫星直接贡献的知识上限（对标 legacy main.js L9363-9370）：
 *   gain = satellite.count * 750（非 cataclysm/orbit_decayed 情形）
 */
export function getSatelliteKnowledgeCapBonus(state: GameState): number {
  return getSatelliteCount(state) * 750;
}

/**
 * 推进剂储备站数量。
 */
export function getPropellantDepotCount(state: GameState): number {
  return getSpaceCount(state, 'propellant_depot');
}

/**
 * 推进剂储备站对石油上限的加成（对标 legacy space.js L159）：
 *   Oil.max += 1250 * count
 */
export function getPropellantDepotOilCapBonus(state: GameState): number {
  return getPropellantDepotCount(state) * 1250;
}

/**
 * 推进剂储备站对氦-3 上限的加成（对标 legacy space.js L160-162）：
 *   仅当 Helium_3 已 display 时生效：Helium_3.max += 1000 * count
 */
export function getPropellantDepotHeliumCapBonus(state: GameState): number {
  if (!state.resource['Helium_3']?.display) return 0;
  return getPropellantDepotCount(state) * 1000;
}

/**
 * GPS 卫星网数量。
 */
export function getGpsCount(state: GameState): number {
  return getSpaceCount(state, 'gps');
}

/**
 * GPS 对贸易路线上限的加成（对标 legacy main.js L9885-9889）：
 *   仅当 gps.count >= 4 时生效：mtrade += gps.count * 2
 */
export function getGpsTradeRouteBonus(state: GameState): number {
  const count = getGpsCount(state);
  if (count < 4) return 0;
  return count * 2;
}

// --- spc_moon ---

export function getMoonBaseCount(state: GameState): number {
  return getSpaceCount(state, 'moon_base');
}

/**
 * moon_base 对铱上限的贡献（对标 legacy space.js L262 + main.js 集成）：
 *   Iridium.max += moon_base.count * 500（baseline 0，无 spatialReasoning）
 */
export function getMoonBaseIridiumCapBonus(state: GameState): number {
  return getMoonBaseCount(state) * 500;
}

/**
 * helium_mine 对氦-3 上限的贡献（对标 legacy space.js L373 + main.js 集成）：
 *   Helium_3.max += helium_mine.count * 100
 */
export function getHeliumMineHeliumCapBonus(state: GameState): number {
  return getSpaceCount(state, 'helium_mine') * 100;
}

export function getObservatoryCount(state: GameState): number {
  return getSpaceCount(state, 'observatory');
}

/**
 * observatory 对知识上限的直接贡献（对标 legacy main.js L9372-9380）：
 *   gain = support_on['observatory'] * 5000
 *   cataclysm 时再乘 1 + satellite.count * 0.25
 */
export function getObservatoryKnowledgeCapBonus(
  state: GameState,
  supportedCount: number,
): number {
  if (supportedCount <= 0) return 0;
  let gain = supportedCount * 5000;
  if (state.race['cataclysm']) {
    gain *= 1 + getSatelliteCount(state) * 0.25;
  }
  return gain;
}

/**
 * exotic_lab 对知识上限的贡献（对标 legacy main.js L9670-9706）：
 *   sci = 500
 *   if ancient_study >= 2: sci += templeCount * 15
 *   gain = support_on['exotic_lab'] * colonist.workers * sci
 *
 * 当前 scope 简化：忽略 science >= 13 的 laboratory bonus / mass_driver / cataclysm / high_pop。
 */
export function getExoticLabKnowledgeCapBonus(
  state: GameState,
  supportedCount: number,
): number {
  if (supportedCount <= 0) return 0;
  let sci = 500;
  if ((state.tech['ancient_study'] ?? 0) >= 2) {
    const templeCount =
      (state.city['temple'] as { count?: number } | undefined)?.count ?? 0;
    sci += templeCount * 15;
  }
  const colonistWorkers =
    (state.civic['colonist'] as { workers?: number } | undefined)?.workers ?? 0;
  return supportedCount * colonistWorkers * sci;
}

// --- spc_red ---

export function getGarageCount(state: GameState): number {
  return getSpaceCount(state, 'garage');
}

/**
 * garage 每座对各资源 max 的基线贡献（non-cataclysm / baseline multiplier=1）。
 * 对标 legacy/src/space.js L874-922：
 *   - multiplier = 1（非 particles>=4 / 非 world_control / 非 blackhole）
 *   - h_multiplier = 1（同上；shelving>=2 才有 ×3）
 *   - val: Copper 6500, Iron 5500, Cement 6000, Steel 4500, Titanium 3500
 *   - Containers +20/座（非 particles>=4）
 *
 * 返回资源 ID → 每座加成。调用方负责乘以当前 garage 数量。
 */
export const GARAGE_STORAGE_PER_BUILDING: Record<string, number> = {
  Copper: 6500,
  Iron: 5500,
  Cement: 6000,
  Steel: 4500,
  Titanium: 3500,
};

/** garage 对 Containers 上限的基线贡献（每座 +20）。 */
export const GARAGE_CONTAINERS_PER_BUILDING = 20;

// --- 供支援 / 燃料 / tick 查询的公共访问器 ---

export { getSpaceCount as getSpaceStructCount, getSpaceOn as getSpaceStructOn };

// --- spc_red: ziggurat ---

/**
 * 对标 legacy/src/space.js L7333-7356 zigguratBonus()：
 *   bonus = 1 + (templeCount * colonist.workers * zig)
 *   zig base = tech['ancient_study'] ? 0.006 : 0.004
 *
 * 当前 scope 简化：忽略 ancient_deify / theocracy / ooze / high_pop 修饰。
 * 调用方（tick.ts）将此乘数应用到所有基础资源产出上。
 */
export function zigguratBonus(state: GameState): number {
  if (getSpaceCount(state, 'ziggurat') <= 0) return 1;
  const zig = (state.tech['ancient_study'] ?? 0) > 0 ? 0.006 : 0.004;
  const templeCount =
    (state.city['temple'] as { count?: number } | undefined)?.count ?? 0;
  const colonistWorkers =
    (state.civic['colonist'] as { workers?: number } | undefined)?.workers ?? 0;
  return 1 + templeCount * colonistWorkers * zig;
}

// --- spc_red: space_barracks ---

/**
 * space_barracks 每座提供的驻军数。
 * 对标 legacy/src/space.js L1407-1419：
 *   soldiers = marines >= 2 ? 4 : 2
 *   evil universe: soldiers-- (non-cataclysm)，+ biodome_on * 0.075
 *   grenadier: soldiers /= 2
 *
 * 当前 scope 简化：忽略 evil universe / grenadier / biodome evil bonus。
 */
export function getSpaceBarracksSoldiers(state: GameState): number {
  return (state.tech['marines'] ?? 0) >= 2 ? 4 : 2;
}

/**
 * space_barracks 每座 on 消耗的石油/tick。
 * 对标 legacy/src/main.js L2394：oil_cost = fuel_adjust(2, true)
 * 当前不实现 fuel_adjust，直接返回 base=2。
 */
export const SPACE_BARRACKS_OIL_PER_TICK = 2;

/**
 * space_barracks 每座 on 消耗的食物/tick（非 cataclysm）。
 * 对标 legacy/src/main.js L3759-3761：space_marines = barracks.on * 10
 */
export const SPACE_BARRACKS_FOOD_PER_TICK = 10;
