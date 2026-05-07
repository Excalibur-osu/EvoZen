import type { GameState } from '@evozen/shared-types';
import { applySpaceScaling } from './space';

export type InterstellarSupportPool = 'alpha' | 'nebula';

export interface InterstellarStructureDefinition {
  id: string;
  region: string;
  name: string;
  description: string;
  reqs: Record<string, number>;
  spaceReqs?: Record<string, number>;
  notTrait?: string[];
  costs: Record<string, (state: GameState, count: number) => number>;
  effect: string;
  powerCost?: number;
  support?: { pool: InterstellarSupportPool; amount: number };
  supportFuel?: { resource: string; amountPerTick: number };
  condition?: (state: GameState) => boolean;
}

function interstellarCost(base: number, mult: number) {
  return (state: GameState, count: number) => {
    const scaledAmt = applySpaceScaling(state, count);
    return Math.ceil(base * Math.pow(mult, scaledAmt));
  };
}

export const INTERSTELLAR_STRUCTURES: InterstellarStructureDefinition[] = [
  {
    id: 'starport',
    region: 'int_alpha',
    name: '星港',
    description: '在半人马座 Alpha 建立前线星港，作为 interstellar 阶段的首个支援枢纽。',
    reqs: { alpha: 1 },
    costs: {
      Money: interstellarCost(1000000, 1.3),
      Aluminium: interstellarCost(400000, 1.3),
      Neutronium: interstellarCost(1000, 1.3),
      Elerium: interstellarCost(100, 1.3),
    },
    effect: '每座需要 10MW 电力、5 氦-3/tick 与 100 食物/tick；每座 on 提供 5 Alpha 支援。',
    powerCost: 10,
    support: { pool: 'alpha', amount: 5 },
    supportFuel: { resource: 'Helium_3', amountPerTick: 5 },
  },
  {
    id: 'mining_droid',
    region: 'int_alpha',
    name: '采矿无人机',
    description: '部署于 Alpha 前线的自动采矿平台，默认优先采集精金。',
    reqs: { alpha: 2 },
    costs: {
      Money: interstellarCost(650000, 1.28),
      Steel: interstellarCost(120000, 1.28),
      Nano_Tube: interstellarCost(75000, 1.28),
      Elerium: interstellarCost(50, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；当前默认产出精金，用于后续 Habitat 建造。',
    support: { pool: 'alpha', amount: -1 },
  },
  {
    id: 'habitat',
    region: 'int_alpha',
    name: '定居点',
    description: '在半人马座 Alpha 四号行星建立永久定居点，扩展星际人口承载与区域支援。',
    reqs: { alpha: 3 },
    costs: {
      Money: interstellarCost(800000, 1.25),
      Furs: interstellarCost(38000, 1.25),
      Adamantite: (state, count) => {
        if (state.race['fasting'] && count < 5) return 0;
        return Math.round(3200 * Math.pow(1.25, count));
      },
      Plywood: interstellarCost(10000, 1.25),
    },
    effect: '每座需要 2MW 电力；每座 on 额外提供 1 Alpha 支援，并使人口上限 +1。',
    powerCost: 2,
    support: { pool: 'alpha', amount: 1 },
  },
  {
    id: 'processing',
    region: 'int_alpha',
    name: '精金加工设施',
    description: '在半人马座 Alpha 建立先进的材料处理与精炼设施，提升采矿无人机的精金产出效率。',
    reqs: { droids: 1 },
    costs: {
      Money: interstellarCost(350000, 1.28),
      Iron: interstellarCost(180000, 1.28),
      Aluminium: interstellarCost(60000, 1.28),
      Iridium: interstellarCost(5000, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；提升采矿无人机的精金产出（基础 +12%）。',
    support: { pool: 'alpha', amount: -1 },
  },
  {
    id: 'fusion',
    region: 'int_alpha',
    name: '聚变反应堆',
    description: '在星际前线部署大型聚变反应堆以满足极高的能源需求。',
    reqs: { fusion: 1 },
    costs: {
      Money: interstellarCost(990000, 1.28),
      Iridium: interstellarCost(44000, 1.28),
      Infernite: interstellarCost(350, 1.28),
      Brick: interstellarCost(18000, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援与 1.25 氘/tick；产出 22MW 电力。',
    powerCost: -22,
    support: { pool: 'alpha', amount: -1 },
    supportFuel: { resource: 'Deuterium', amountPerTick: 1.25 },
  },
  {
    id: 'exchange',
    region: 'int_alpha',
    name: '星际交易所',
    description: '跨越星系的庞大金融交易网络节点，极大扩展资金储备。',
    reqs: { banking: 12 },
    costs: {
      Money: interstellarCost(680000, 1.28),
      Stone: interstellarCost(115000, 1.28),
      Adamantite: interstellarCost(55000, 1.28),
      Graphene: interstellarCost(78000, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；大幅提升资金上限。',
    support: { pool: 'alpha', amount: -1 },
  },
  {
    id: 'laboratory',
    region: 'int_alpha',
    name: '深空实验室',
    description: '在半人马座 Alpha 建立最高端的研究中心，进一步突破知识极限。',
    reqs: { science: 12 },
    costs: {
      Money: interstellarCost(750000, 1.28),
      Titanium: interstellarCost(120000, 1.28),
      Alloy: interstellarCost(95000, 1.28),
      Mythril: interstellarCost(8500, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；大幅提升知识容量上限（基础 +10000）。',
    support: { pool: 'alpha', amount: -1 },
  },

  // ==================== int_proxima: 比邻星 ====================
  // 对标 legacy/src/space.js interstellarProjects.int_proxima
  {
    id: 'xfer_station',
    region: 'int_proxima',
    name: '传输站',
    description: '在比邻星建立物质传输站，为星际运输线提供支援并扩展燃料储备上限。',
    reqs: { proxima: 1 },
    costs: {
      Money: interstellarCost(1_200_000, 1.28),
      Neutronium: interstellarCost(1_500, 1.28),
      Adamantite: interstellarCost(6_000, 1.28),
      Polymer: interstellarCost(12_000, 1.28),
      Wrought_Iron: interstellarCost(3_500, 1.28),
    },
    effect: '每座提供 1 Alpha 支援；提升油料/氦-3/铀上限；消耗 0.28 铀/tick 与 1MW 电力。',
    powerCost: 1,
    support: { pool: 'alpha', amount: 1 },
  },
  {
    id: 'cargo_yard',
    region: 'int_proxima',
    name: '货运码头',
    description: '在比邻星建立大型货运码头，扩展板条箱/集装箱与稀有矿物上限。',
    reqs: { proxima: 2 },
    costs: {
      Money: interstellarCost(275_000, 1.28),
      Graphene: interstellarCost(7_500, 1.28),
      Mythril: interstellarCost(6_000, 1.28),
    },
    effect: '每座 +50 板条箱上限、+50 集装箱上限；+200 中子素上限、+150 炎晶上限。',
  },
  {
    id: 'cruiser',
    region: 'int_proxima',
    name: '巡洋舰',
    description: '在比邻星部署星际巡洋舰，扩充远征军事力量。',
    reqs: { cruiser: 1 },
    costs: {
      Money: interstellarCost(875_000, 1.28),
      Aluminium: interstellarCost(195_000, 1.28),
      Neutronium: interstellarCost(2_000, 1.28),
      Aerogel: interstellarCost(250, 1.28),
    },
    effect: '每艘提供 3 驻军上限；每 tick 消耗 6 氦-3。',
  },
  {
    id: 'dyson',
    region: 'int_proxima',
    name: '戴森球（建造中）',
    description: '在比邻星轨道建造戴森球能量收集网络，分 100 段完工。',
    reqs: { proxima: 3 },
    condition: (state) => {
      const d = state.interstellar['dyson'] as { count?: number } | undefined;
      return (d?.count ?? 0) < 100 || !(state.tech['dyson'] as number | undefined);
    },
    costs: {
      Money:       (_state, count) => count < 100 ? 250_000 : 0,
      Adamantite:  (_state, count) => count < 100 ? 10_000 : 0,
      Infernite:   (_state, count) => count < 100 ? 25 : 0,
      Stanene:     (_state, count) => count < 100 ? 100_000 : 0,
    },
    effect: '共需建造 100 段；完工后产出 175MW 电力并解锁戴森球升级。',
  },
  {
    id: 'dyson_sphere',
    region: 'int_proxima',
    name: '戴森球（完整）',
    description: '戴森球完工后的扩展升级，分 100 段将产电量提升至 750MW。',
    reqs: { proxima: 3, dyson: 1 },
    condition: (state) => {
      const d = state.interstellar['dyson'] as { count?: number } | undefined;
      const ds = state.interstellar['dyson_sphere'] as { count?: number } | undefined;
      return (d?.count ?? 0) >= 100 && (state.tech['dyson'] as number | undefined) === 1 && (ds?.count ?? 0) < 100;
    },
    costs: {
      Money:     (_state, count) => count < 100 ? 5_000_000 : 0,
      Bolognium: (_state, count) => count < 100 ? 25_000 : 0,
      Vitreloy:  (_state, count) => count < 100 ? 1_250 : 0,
      Aerogel:   (_state, count) => count < 100 ? 75_000 : 0,
    },
    effect: '共需建造 100 段；完工后总产电 750MW。',
  },

  // ==================== int_nebula: 星云 ====================
  // 对标 legacy/src/space.js interstellarProjects.int_nebula
  {
    id: 'nexus',
    region: 'int_nebula',
    name: '星云枢纽',
    description: '在星云中建立资源枢纽，提供星云支援并大幅扩展燃料上限。',
    reqs: { nebula: 1 },
    costs: {
      Money: interstellarCost(900_000, 1.24),
      Adamantite: interstellarCost(7_500, 1.24),
      Infernite: interstellarCost(250, 1.24),
      Sheet_Metal: interstellarCost(14_000, 1.24),
      Nano_Tube: interstellarCost(17_500, 1.24),
    },
    effect: '每座提供 2 星云支援；扩展 Oil/氦-3/氘/超铀上限；消耗 8MW 电力与 350 金/tick。',
    powerCost: 8,
    support: { pool: 'nebula', amount: 2 },
  },
  {
    id: 'harvester',
    region: 'int_nebula',
    name: '星云收割机',
    description: '在星云中部署收割机，自动采集氦-3（及氘，需 ram_scoop 科技）。',
    reqs: { nebula: 2 },
    costs: {
      Money: interstellarCost(650_000, 1.28),
      Copper: interstellarCost(80_000, 1.28),
      Alloy: interstellarCost(45_000, 1.28),
      Iridium: interstellarCost(8_000, 1.28),
    },
    effect: '每座消耗 1 星云支援；持续产出氦-3（及氘）。',
    support: { pool: 'nebula', amount: -1 },
  },
  {
    id: 'elerium_prospector',
    region: 'int_nebula',
    name: '星云超铀探矿机',
    description: '在星云中开采超铀元素（Elerium）。',
    reqs: { nebula: 3 },
    costs: {
      Money: interstellarCost(825_000, 1.28),
      Steel: interstellarCost(18_000, 1.28),
      Polymer: interstellarCost(22_000, 1.28),
      Graphene: interstellarCost(82_000, 1.28),
      Stanene: interstellarCost(57_000, 1.28),
    },
    effect: '每座消耗 1 星云支援；持续产出 Elerium。',
    support: { pool: 'nebula', amount: -1 },
  },

  // ==================== int_neutron: 中子星 ====================
  // 对标 legacy/src/space.js interstellarProjects.int_neutron
  {
    id: 'neutron_miner',
    region: 'int_neutron',
    name: '中子素采矿机',
    description: '在中子星引力井附近采集中子素，并扩展中子素上限。',
    reqs: { neutron: 1 },
    costs: {
      Money: interstellarCost(1_000_000, 1.32),
      Titanium: interstellarCost(45_000, 1.32),
      Stanene: interstellarCost(88_000, 1.32),
      Elerium: interstellarCost(20, 1.32),
      Aerogel: interstellarCost(50, 1.32),
    },
    effect: '每座产出中子素；+500 中子素上限；消耗 6MW 电力与 3 氦-3/tick。',
    powerCost: 6,
  },
  {
    id: 'citadel',
    region: 'int_neutron',
    name: '量子城堡',
    description: '在中子星附近建立量子研究堡垒，大幅提升科研产出与建造效率。',
    reqs: { neutron: 1, high_tech: 15 },
    costs: {
      Money: interstellarCost(5_000_000, 1.25),
      Knowledge: interstellarCost(1_500_000, 1.15),
      Graphene: interstellarCost(50_000, 1.25),
      Stanene: interstellarCost(100_000, 1.25),
      Elerium: interstellarCost(250, 1.25),
      Soul_Gem: interstellarCost(1, 1.25),
    },
    effect: '每座通电 30MW（每多一座额外 +2.5MW）；提升量子等级加成与工匠/科研产出。',
    powerCost: 30,
  },
  {
    id: 'stellar_forge',
    region: 'int_neutron',
    name: '恒星熔炉',
    description: '在中子星附近建立高能熔炉，大幅扩展工匠上限与冶炼效率。',
    reqs: { star_forge: 1 },
    costs: {
      Money: interstellarCost(1_200_000, 1.25),
      Iridium: interstellarCost(250_000, 1.25),
      Bolognium: interstellarCost(35_000, 1.25),
      Aerogel: interstellarCost(75_000, 1.25),
    },
    effect: '每座通电 3MW；工匠上限 +2，熔炉效率 +10%，精炼效率 +5%。',
    powerCost: 3,
  },

  // ==================== int_blackhole: 黑洞 ====================
  // 对标 legacy/src/space.js interstellarProjects.int_blackhole
  {
    id: 'far_reach',
    region: 'int_blackhole',
    name: '远距探针网络',
    description: '在黑洞附近部署远距探针，扩展知识控制器加成。',
    reqs: { blackhole: 1 },
    costs: {
      Money: interstellarCost(1_000_000, 1.32),
      Knowledge: interstellarCost(100_000, 1.32),
      Neutronium: interstellarCost(2_500, 1.32),
      Elerium: interstellarCost(100, 1.32),
      Aerogel: interstellarCost(1_000, 1.32),
    },
    effect: '每座通电 5MW；世界控制器知识上限加成 +1%/座。',
    powerCost: 5,
  },
  {
    id: 'stellar_engine',
    region: 'int_blackhole',
    name: '恒星引擎（建造中）',
    description: '利用黑洞引力建造恒星引擎，分 100 段完工后产生大量电力并为转生积累质量。',
    reqs: { blackhole: 3 },
    condition: (state) =>
      ((state.interstellar['stellar_engine'] as { count?: number } | undefined)?.count ?? 0) < 100,
    costs: {
      Money:      (_state, count) => count < 100 ? 500_000 : 0,
      Neutronium: (_state, count) => count < 100 ? 450 : 0,
      Adamantite: (_state, count) => count < 100 ? 17_500 : 0,
      Infernite:  (_state, count) => count < 100 ? 225 : 0,
      Graphene:   (_state, count) => count < 100 ? 45_000 : 0,
      Mythril:    (_state, count) => count < 100 ? 250 : 0,
      Aerogel:    (_state, count) => count < 100 ? 75 : 0,
    },
    effect: '共需建造 100 段；完工后产生大量电力（基础 20MW + 质量加成）并积累转生质量。',
  },
  {
    id: 'mass_ejector',
    region: 'int_blackhole',
    name: '质量喷射器',
    description: '向黑洞喷射物质以增加恒星引擎质量，为大爆炸转生积累奇异质量。',
    reqs: { blackhole: 5 },
    costs: {
      Money: interstellarCost(750_000, 1.25),
      Adamantite: interstellarCost(125_000, 1.25),
      Infernite: interstellarCost(275, 1.25),
      Elerium: interstellarCost(100, 1.25),
      Mythril: interstellarCost(10_000, 1.25),
    },
    effect: '每座通电 3MW；开启质量喷射界面，可消耗各类资源积累恒星引擎质量。',
    powerCost: 3,
  },
  {
    id: 'stargate',
    region: 'int_blackhole',
    name: '星门（建造中）',
    description: '在黑洞附近建造通往银河系的星门，分 200 段完工后连通银河系区域。',
    reqs: { stargate: 3 },
    condition: (state) =>
      ((state.interstellar['stargate'] as { count?: number } | undefined)?.count ?? 0) < 200,
    costs: {
      Money:      (_state, count) => count < 200 ? 1_000_000 : 0,
      Neutronium: (_state, count) => count < 200 ? 4_800 : 0,
      Infernite:  (_state, count) => count < 200 ? 666 : 0,
      Elerium:    (_state, count) => count < 200 ? 75 : 0,
      Nano_Tube:  (_state, count) => count < 200 ? 12_000 : 0,
      Stanene:    (_state, count) => count < 200 ? 60_000 : 0,
      Mythril:    (_state, count) => count < 200 ? 3_200 : 0,
    },
    effect: '共需建造 200 段；完工后生成通电版星门（s_gate）并开启银河系区域。',
  },
  {
    id: 's_gate',
    region: 'int_blackhole',
    name: '星门',
    description: '星门完工后的激活形态；通电 250MW 后连通银河系，解锁 gxy_stargate 区域。',
    reqs: { stargate: 4 },
    condition: (state) =>
      ((state.interstellar['stargate'] as { count?: number } | undefined)?.count ?? 0) >= 200,
    costs: {},
    effect: '通电 250MW；维持星门连接，允许进入银河系区域。',
    powerCost: 250,
  },

  // ==================== int_sirius: 天狼星 ====================
  // 对标 legacy/src/space.js interstellarProjects.int_sirius
  {
    id: 'space_elevator',
    region: 'int_sirius',
    name: '太空电梯（建造中）',
    description: '在天狼星卫星建造太空电梯，分 100 段完工后开启终局升天系统。',
    reqs: { ascension: 4 },
    condition: (state) =>
      ((state.interstellar['space_elevator'] as { count?: number } | undefined)?.count ?? 0) < 100,
    costs: {
      Money:     (_state, count) => count < 100 ? 20_000_000 : 0,
      Nano_Tube: (_state, count) => count < 100 ? 500_000 : 0,
      Bolognium: (_state, count) => count < 100 ? 100_000 : 0,
      Mythril:   (_state, count) => count < 100 ? 125_000 : 0,
    },
    effect: '共需建造 100 段；完工后开启升天触发器，可选择终局转生路线。',
  },
  {
    id: 'ascension_trigger',
    region: 'int_sirius',
    name: '升天触发器',
    description: '太空电梯完工后解锁的终局建筑，触发后执行升天转生。',
    reqs: { ascension: 5 },
    condition: (state) =>
      ((state.interstellar['space_elevator'] as { count?: number } | undefined)?.count ?? 0) >= 100,
    costs: {},
    effect: '触发后选择升天路线（大爆炸 / 播种 / 黑洞 等），执行终局转生并获得永久加成。',
  },
];

function getInterstellarCount(state: GameState, id: string): number {
  return (state.interstellar[id] as { count?: number } | undefined)?.count ?? 0;
}

export function getInterstellarBuildCost(state: GameState, id: string): Record<string, number> {
  const def = INTERSTELLAR_STRUCTURES.find((structure) => structure.id === id);
  if (!def) return {};

  const count = getInterstellarCount(state, id);
  const costs: Record<string, number> = {};
  for (const [resId, fn] of Object.entries(def.costs)) {
    costs[resId] = fn(state, count);
  }
  return costs;
}

export function canBuildInterstellarStructure(state: GameState, id: string): boolean {
  const def = INTERSTELLAR_STRUCTURES.find((structure) => structure.id === id);
  if (!def) return false;

  for (const [reqKey, reqLevel] of Object.entries(def.reqs)) {
    if ((state.tech[reqKey] ?? 0) < reqLevel) return false;
  }

  if (def.condition && !def.condition(state)) return false;

  const costs = getInterstellarBuildCost(state, id);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

export function listInterstellarPowerConsumers(): InterstellarStructureDefinition[] {
  return INTERSTELLAR_STRUCTURES.filter((structure) => (structure.powerCost ?? 0) > 0);
}

export interface InterstellarSupportResult {
  supportOn: Record<string, number>;
  fuelDrain: Record<string, number>;
  supplierEffectiveOn: Record<string, number>;
}

export function resolveInterstellarSupport(
  state: GameState,
  powerOn: Record<string, number> = {},
): InterstellarSupportResult {
  const result: InterstellarSupportResult = {
    supportOn: {},
    fuelDrain: {},
    supplierEffectiveOn: {},
  };

  const starport = state.interstellar['starport'] as
    | { count?: number; on?: number; support?: number; s_max?: number }
    | undefined;
  const habitat = state.interstellar['habitat'] as
    | { count?: number; on?: number }
    | undefined;


  const requestedOn = powerOn['starport'] ?? 0;
  
  // TODO(sprint): 提取并补全 int_fuel_adjust 机制
  const isDecayed = state.race['cataclysm'] || state.race['orbit_decayed'];
  const fuelPerUnit = isDecayed ? 5 * 0.25 : 5;
  const foodPerUnit = 100;
  let availableFuel = state.resource['Helium_3']?.amount ?? 0;
  let activeStarports = 0;

  for (let i = 0; i < requestedOn; i++) {
    if (availableFuel >= fuelPerUnit) {
      availableFuel -= fuelPerUnit;
      activeStarports++;
    } else {
      break;
    }
  }

  const activeHabitats = powerOn['habitat'] ?? 0;
  result.supplierEffectiveOn['starport'] = activeStarports;
  result.supplierEffectiveOn['habitat'] = activeHabitats;

  if (activeStarports > 0) {
    result.fuelDrain['Helium_3'] = activeStarports * fuelPerUnit;
    result.fuelDrain['Food'] = activeStarports * foodPerUnit;
  }

  const totalSupport = activeStarports * 5 + activeHabitats;
  let usedSupport = 0;

  // 按照定义顺序（通常与原版优先级相关）分配支援
  const consumers = INTERSTELLAR_STRUCTURES.filter(s => s.support?.pool === 'alpha' && s.support.amount < 0);
  for (const consumer of consumers) {
    const id = consumer.id;
    const struct = state.interstellar[id] as { count?: number; on?: number } | undefined;
    const count = struct?.count ?? 0;
    if (count <= 0) {
      result.supportOn[id] = 0;
      continue;
    }
    
    // 如果建筑有开关，按开关；否则按 count
    const requested = struct?.on ?? count;
    const costPerUnit = Math.abs(consumer.support!.amount);
    
    // 能支持的最大数量（受剩余支援、请求数量限制）
    const supportable = Math.min(requested, Math.floor((totalSupport - usedSupport) / costPerUnit));
    
    result.supportOn[id] = supportable;
    usedSupport += supportable * costPerUnit;
  }

  if (starport) {
    starport.s_max = activeStarports * 5 + activeHabitats;
    starport.support = usedSupport;
  }
  if (habitat && (habitat.count ?? 0) > 0 && result.supplierEffectiveOn['habitat'] === undefined) {
    result.supplierEffectiveOn['habitat'] = 0;
  }

  return result;
}
