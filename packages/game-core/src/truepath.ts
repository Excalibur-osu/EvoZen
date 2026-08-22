/**
 * Truepath（真相之路）模式 — 对标 legacy/src/truepath.js (6431 行)
 *
 * Truepath 是一个挑战模式，关闭传送门/bigbang/ascension 等转生路径，
 * 改为通过外太阳系探索（土星 → 海王星 → 柯伊伯带 → 厄里斯）
 * 最终触发 retirement 转生（点燃气态巨星 + AI 核心）。
 *
 * 包含 5 个新区域：
 *   - spc_titan       土星（土星系基地，AI 殖民）
 *   - spc_enceladus   土卫二（冰封卫星，氢氦采集）
 *   - spc_triton      海卫一（前哨基地，远程探索）
 *   - spc_kuiper      柯伊伯带（稀有矿采集）
 *   - spc_eris        厄里斯（终局，发现古代外星种族 + 触发 retirement）
 */

import type { GameState, GrapheneFactoryState } from '@evozen/shared-types';
import { addInflationPoints, applyInflationToCosts } from './challenges';
import { calculateQuantumLevel } from './factory';
import { getFactoryOutputMultiplier } from './government';
import { getPsychicProductionMultiplier } from './production-modifiers';
import { armyRating, garrisonSize } from './military';
import { zigguratBonus } from './space';
import { getTraitVar } from './trait-ranks';
import {
  TRUEPATH_STOREHOUSE_RESOURCES,
  getTruepathStorehouseStorageBonus,
} from './truepath-storage';

// ============================================================
// Truepath 区域定义
// ============================================================

export type TruepathRegionId = 'titan' | 'enceladus' | 'triton' | 'kuiper' | 'eris';

export interface TruepathRegionDef {
  id: TruepathRegionId;
  name: string;
  desc: string;
  /** 轨道距离（AU） */
  dist: number;
  /** 公转周期（天） */
  orbit: number;
  /** 解锁科技要求 */
  reqs: Record<string, number>;
}

export const TRUEPATH_REGIONS: Record<TruepathRegionId, TruepathRegionDef> = {
  titan: {
    id: 'titan', name: '土卫六', desc: '土星最大卫星，建立 AI 殖民地的理想之地。',
    dist: 9.536, orbit: 10751, reqs: { outer: 1 },
  },
  enceladus: {
    id: 'enceladus', name: '土卫二', desc: '冰封卫星，富含氢和水冰。',
    dist: 9.542, orbit: 10751, reqs: { outer: 2, titan: 3 },
  },
  triton: {
    id: 'triton', name: '海卫一', desc: '海王星最大卫星，孤悬太阳系外侧的边境前哨。',
    dist: 30.1, orbit: 60152, reqs: { outer: 2 },
  },
  kuiper: {
    id: 'kuiper', name: '柯伊伯带', desc: '太阳系外缘的小行星带，富含稀有矿物。',
    dist: 30.0, orbit: 60500, reqs: { outer: 4 },
  },
  eris: {
    id: 'eris', name: '厄里斯', desc: '矮行星，发现古代外星文明遗迹。',
    dist: 67.0, orbit: 203000, reqs: { outer: 5 },
  },
};

// ============================================================
// Truepath 建筑定义
// ============================================================

export interface TruepathBuildingDef {
  id: string;
  region: TruepathRegionId;
  name: string;
  desc: string;
  reqs: Record<string, number>;
  baseCost: Record<string, number>;
  costMult: number;
  /** MW，正值消耗，负值发电 */
  power: number;
  effectDesc: string;
  buildable?: boolean;
  maxCount?: number;
  grant?: readonly [string, number];
}

export const TRUEPATH_BUILDINGS: TruepathBuildingDef[] = [
  // ----- Titan (土卫六) -----
  { id: 'titan_mission',    region: 'titan', name: '土卫六任务',   desc: '发射飞船登陆土卫六。',                       reqs: { outer: 1 },                       baseCost: { Helium_3: 250000, Elerium: 100 }, costMult: 1.0, power: 0, effectDesc: '解锁土卫六探索。' },
  { id: 'titan_spaceport',  region: 'titan', name: '土卫六港口',   desc: '土卫六上的物资中转站。',                     reqs: { titan: 1 },                       baseCost: { Money: 2500000, Lumber: 750000, Cement: 350000, Mythril: 10000 }, costMult: 1.32, power: 10, effectDesc: '为其他卫星基地提供支持配额。' },
  { id: 'electrolysis',     region: 'titan', name: '水电解装置',   desc: '消耗水与电力，为土卫六设施提供支援。',         reqs: { titan: 3 },                       baseCost: { Money: 1000000, Copper: 185000, Steel: 220000, Polymer: 380000 }, costMult: 1.25, power: 8, effectDesc: '每座消耗 35 水，提供 2 点土卫六支援；AI 核心升级后提供 3 点。' },
  { id: 'hydrogen_plant',   region: 'titan', name: '氢气厂',       desc: '将氢气压缩为可使用燃料。',                   reqs: { titan: 2 },                       baseCost: { Money: 1250000, Adamantite: 75000, Nano_Tube: 35000 }, costMult: 1.32, power: -22, effectDesc: '消耗氢发电 22 MW。' },
  { id: 'titan_quarters',   region: 'titan', name: '居住舱',       desc: '土卫六上的居住空间。',                       reqs: { titan: 3 },                       baseCost: { Money: 2750000, Cement: 350000, Furs: 75000, Stanene: 25000 }, costMult: 1.32, power: 2, effectDesc: '+1 殖民者岗位。' },
  { id: 'titan_mine',       region: 'titan', name: '土卫六矿场',   desc: '在土卫六开采资源。',                         reqs: { titan: 3 },                       baseCost: { Money: 850000, Polymer: 22500, Aluminium: 175000 }, costMult: 1.32, power: 4, effectDesc: '+1 矿工岗位。' },
  { id: 'storehouse',       region: 'titan', name: '土卫六仓库',   desc: '在土卫六建立适应深空物流的资源仓库。',           reqs: { titan: 5 },                       baseCost: { Money: 175000, Lumber: 100000, Aluminium: 120000, Cement: 45000 }, costMult: 1.28, power: 0, effectDesc: '为已发现的基础资源、工业材料和高级矿物增加容量。' },
  { id: 'titan_bank',       region: 'titan', name: '土卫六银行',   desc: '为殖民地服务的金融机构。',                   reqs: { titan: 4 },                       baseCost: { Money: 5000000, Cement: 200000, Plywood: 150000, Furs: 95000 }, costMult: 1.32, power: 0, effectDesc: '+1.25M 金币容量。' },
  { id: 'g_factory',        region: 'titan', name: '零重力工厂',   desc: '分配木材、煤炭或石油产线制造石墨烯。',        reqs: { graphene: 1 },                    baseCost: { Money: 950000, Copper: 165000, Stone: 220000, Adamantite: 12500 }, costMult: 1.28, power: 0, effectDesc: '消耗 1 点土卫六支援，解锁石墨烯原料产线。' },
  { id: 'sam',              region: 'titan', name: 'SAM 导弹站',   desc: '防御土卫六基地的导弹系统。',                 reqs: { titan: 6 },                       baseCost: { Money: 22000000, Aluminium: 1750000, Mythril: 65000 }, costMult: 1.32, power: 4, effectDesc: '+1 反辛迪加海盗。' },
  { id: 'decoder',          region: 'titan', name: '解码器',       desc: '解析外星信号的设备。',                       reqs: { titan: 7 },                       baseCost: { Money: 25000000, Stanene: 75000, Vitreloy: 17500, Quantium: 100 }, costMult: 1.32, power: 4, effectDesc: '解码外星信号，推进 AI 科技。' },
  { id: 'ai_core',          region: 'titan', name: 'AI 核心',     desc: '强大的人工智能计算核心。',                   reqs: { titan: 8 },                       baseCost: { Money: 50000000, Bolognium: 125000, Vitreloy: 90000, Quantium: 1500 }, costMult: 1.0, power: 0, effectDesc: '触发 AI 末日转生路径。' },
  { id: 'ai_colonist',      region: 'titan', name: 'AI 殖民者',   desc: 'AI 控制的机器人殖民者。',                    reqs: { titan: 9 },                       baseCost: { Money: 17500000, Adamantite: 250000, Stanene: 175000, Quantium: 75 }, costMult: 1.32, power: 1, effectDesc: '+1 AI 殖民者（更高产出）。' },
  { id: 'wonder_gardens',   region: 'titan', name: '奇景花园',     desc: '土卫六上的奇景。',                           reqs: { titan: 10 },                      baseCost: { Money: 25000000000, Crystal: 1000000 }, costMult: 1.0, power: 0, effectDesc: '士气 +25。' },

  // ----- Enceladus (土卫二) -----
  { id: 'enceladus_mission', region: 'enceladus', name: '土卫二任务',  desc: '探索土卫二冰下海洋。',                       reqs: { enceladus: 1 },                  baseCost: { Helium_3: 350000 }, costMult: 1.0, power: 0, effectDesc: '解锁土卫二建筑。' },
  { id: 'water_freighter',   region: 'enceladus', name: '水货船',     desc: '将土卫二的水运输到土卫六。',                 reqs: { enceladus: 2 },                  baseCost: { Money: 450000, Iron: 362000, Nano_Tube: 125000, Sheet_Metal: 75000 }, costMult: 1.25, power: 0, effectDesc: '消耗 1 点土卫二支援并生产水。' },
  { id: 'zero_g_lab',        region: 'enceladus', name: '零重力实验室', desc: '冰封海洋下的科学站。',                       reqs: { enceladus: 3 },                  baseCost: { Money: 5000000, Alloy: 125000, Graphene: 225000, Stanene: 600000 }, costMult: 1.25, power: 12, effectDesc: '消耗 1 点土卫二支援，提供知识容量与 1 条量子素工匠产线。' },
  { id: 'operating_base',    region: 'enceladus', name: '作战基地',   desc: '驻扎部队的前线基地。',                       reqs: { enceladus: 4 },                  baseCost: { Money: 18000000, Furs: 750000, Iridium: 175000, Soul_Gem: 25 }, costMult: 1.32, power: 4, effectDesc: '+5 驻军容量。' },
  { id: 'munitions_depot',   region: 'enceladus', name: '弹药库',     desc: '储存外星弹药。',                             reqs: { enceladus: 5 },                  baseCost: { Money: 7500000, Adamantite: 200000, Stanene: 75000 }, costMult: 1.32, power: 1, effectDesc: '增加 SAM 弹药容量。' },

  // ----- Triton (海卫一) -----
  { id: 'triton_mission', region: 'triton', name: '海卫一任务', desc: '派遣任务队探索海卫一。', reqs: { outer: 2 }, baseCost: { Helium_3: 600_000, Elerium: 2_500 }, costMult: 1, power: 0, effectDesc: '建立海卫一任务并解锁前沿作战基地研究。', maxCount: 1, grant: ['triton', 1] },
  { id: 'fob', region: 'triton', name: '前进基地', desc: '在海卫一部署用于争夺坠毁飞船的前沿基地。', reqs: { triton: 2 }, baseCost: { Money: 250_000_000, Copper: 8_000_000, Uranium: 50_000, Nano_Tube: 2_500_000, Graphene: 3_000_000, Sheet_Metal: 7_500_000, Quantium: 500_000 }, costMult: 1.1, power: 50, effectDesc: '最多一座；通电并消耗氦-3后允许登陆器部署士兵。', maxCount: 1 },
  { id: 'lander', region: 'triton', name: '登陆器', desc: '向海卫一前线运输士兵并回收坠毁飞船数据。', reqs: { triton: 3 }, baseCost: { Money: 2_400_000, Aluminium: 185_000, Neutronium: 10_000, Nano_Tube: 158_000 }, costMult: 1.15, power: 0, effectDesc: '每艘需要 3 名士兵和 125 石油/tick；控制完成后生产 0.005 Cipher/tick。' },
  { id: 'crashed_ship', region: 'triton', name: '坠毁飞船', desc: '辛迪加与前线部队争夺的外星飞船残骸。', reqs: { triton: 3 }, baseCost: {}, costMult: 1, power: 0, effectDesc: '控制度由每日海卫一战斗自动推进；达到 100 后解锁 Cipher。', buildable: false },

  // ----- Kuiper Belt (柯伊伯带) -----
  { id: 'kuiper_mission',   region: 'kuiper', name: '柯伊伯带任务',   desc: '探索柯伊伯带。',                             reqs: { kuiper: 1 },                       baseCost: { Helium_3: 750000, Elerium: 500 }, costMult: 1.0, power: 0, effectDesc: '解锁柯伊伯带采矿。' },
  { id: 'orichalcum_mine',  region: 'kuiper', name: '黄金矿',         desc: '采集黄金矿。',                   reqs: { kuiper: 2 },                       baseCost: { Money: 32500000, Adamantite: 1500000, Aerogel: 350000, Vitreloy: 12500 }, costMult: 1.28, power: 7, effectDesc: '+ 黄金矿产出。' },
  { id: 'elerium_mine',     region: 'kuiper', name: '超铀矿',         desc: '采集超铀矿。',                          reqs: { kuiper: 2 },                       baseCost: { Money: 32500000, Adamantite: 1500000, Aerogel: 350000, Vitreloy: 12500 }, costMult: 1.28, power: 8, effectDesc: '+ 超铀产出。' },
  { id: 'uranium_mine',     region: 'kuiper', name: '铀矿',           desc: '从柯伊伯带采集铀。',                         reqs: { kuiper: 2 },                       baseCost: { Money: 17500000, Polymer: 500000, Stanene: 250000, Aerogel: 100000 }, costMult: 1.28, power: 6, effectDesc: '+ 铀产出。' },
  { id: 'neutronium_mine',  region: 'kuiper', name: '中子素矿',       desc: '柯伊伯带中的超致密矿物。',                   reqs: { kuiper: 2 },                       baseCost: { Money: 28000000, Bolognium: 175000, Vitreloy: 45000 }, costMult: 1.28, power: 8, effectDesc: '+ 中子素产出。' },

  // ----- Eris (厄里斯) — 部分关键建筑 -----
  { id: 'eris_mission',      region: 'eris', name: '厄里斯任务',     desc: '航行至太阳系最外侧的矮行星。',               reqs: { eris: 1 },                          baseCost: { Helium_3: 1500000, Elerium: 1000 }, costMult: 1.0, power: 0, effectDesc: '解锁厄里斯建筑。' },
  { id: 'digsite',           region: 'eris', name: '考古发掘',       desc: '挖掘厄里斯上的古老外星遗迹。',               reqs: { eris: 2 },                          baseCost: { Money: 75000000, Lumber: 1750000, Furs: 750000, Adamantite: 250000 }, costMult: 1.0, power: 0, effectDesc: '产生考古进度，最终触发外星接触。' },
  { id: 'contact',           region: 'eris', name: '接触外星',       desc: '尝试与古代外星文明接触。',                   reqs: { eris: 3 },                          baseCost: { Money: 1500000000, Quantium: 250000 }, costMult: 1.0, power: 0, effectDesc: '触发外星接触剧情。' },
  { id: 'tank',              region: 'eris', name: '坦克',           desc: '坦克部队，进攻外星基地。',                   reqs: { eris: 4 },                          baseCost: { Money: 18000000, Adamantite: 350000, Aerogel: 100000 }, costMult: 1.32, power: 4, effectDesc: '+5 战斗评分。' },
  { id: 'shock_trooper',     region: 'eris', name: '突击兵',         desc: '与外星人作战的精锐部队。',                   reqs: { eris: 4 },                          baseCost: { Money: 18000000, Adamantite: 250000, Vitreloy: 80000 }, costMult: 1.32, power: 0, effectDesc: '+10 战斗评分。' },
  { id: 'ignite_gas_giant',  region: 'eris', name: '点燃气态巨星',   desc: '将木星点燃为微型恒星 — Truepath 终极目标。', reqs: { eris: 6 },                          baseCost: { Money: 50000000000, Quantium: 1000000, Soul_Gem: 1000 }, costMult: 1.0, power: 0, effectDesc: '点燃木星，触发 Retirement 转生。' },
  { id: 'matrioshka_brain',  region: 'eris', name: '戴森球',         desc: '完整包裹太阳的能源结构 — Truepath AI 终极。',  reqs: { eris: 7 },                          baseCost: { Money: 100000000000, Adamantite: 50000000, Quantium: 5000000 }, costMult: 1.0, power: 0, effectDesc: 'AI 末日终极胜利。' },
];

// ============================================================
// Truepath 模式工具
// ============================================================

/** 判断是否启用 Truepath 模式 */
export function isTruepath(state: GameState): boolean {
  return !!state.race['truepath'];
}

/** 判断某区域是否解锁 */
export function isTruepathRegionUnlocked(state: GameState, region: TruepathRegionId): boolean {
  const def = TRUEPATH_REGIONS[region];
  for (const [tech, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  return true;
}

/** 计算 Truepath 中海盗辛迪加压力（对标 syndicate L28-34） */
export function getSyndicatePressure(state: GameState, region: TruepathRegionId): number {
  if (!isTruepath(state)) return 0;
  const samBonus = ((state.space as Record<string, { on?: number }>)['sam']?.on ?? 0) * 100;
  const munitions = ((state.space as Record<string, { on?: number }>)['munitions_depot']?.on ?? 0) * 50;

  const basePressure: Record<TruepathRegionId, number> = {
    titan: 100, enceladus: 200, triton: 600, kuiper: 800, eris: 1500,
  };
  return Math.max(0, basePressure[region] - samBonus - munitions);
}

/**
 * 计算某区域的辛迪加产出衰减乘数（压力越高，衰减越大；最高衰减 80%）
 */
export function getSyndicateProductionMultiplier(state: GameState, region: TruepathRegionId): number {
  if (!state.race['truepath']) return 1;
  const space = state.space as Record<string, { on?: number }>;
  const sam = (space['sam']?.on ?? 0) * 100;
  const munitions = (space['munitions_depot']?.on ?? 0) * 50;
  const patrolShip = (space['patrol_ship']?.on ?? 0) * 75;
  const fob = (space['fob']?.on ?? 0) * 200;
  const basePressure: Record<TruepathRegionId, number> = {
    titan: 100, enceladus: 200, triton: 600, kuiper: 800, eris: 1500,
  };
  const pressure = Math.max(0, basePressure[region] - sam - munitions - patrolShip - fob);
  // 压力 / 2000 = 衰减比例（titan 压力 100 → 5% 衰减；eris 1500 → 75% 衰减）
  const decay = Math.min(0.8, pressure / 2000);
  return 1 - decay;
}

export interface EnceladusSupportResult {
  capacity: number;
  waterFreighter: number;
  zeroGLab: number;
}

/** 土卫二支援按建筑顺序分配：水货船优先，零重力实验室随后。 */
export function resolveEnceladusSupport(
  state: GameState,
  poweredOn: Record<string, number>,
): EnceladusSupportResult {
  const capacity = Math.max(0, poweredOn['titan_spaceport'] ?? 0) * 2;
  const freighter = state.space['water_freighter'] as { count?: number; on?: number } | undefined;
  const requestedFreighters = Math.max(0, freighter?.on ?? freighter?.count ?? 0);
  const waterFreighter = Math.min(requestedFreighters, capacity);
  const zeroGLab = Math.min(
    Math.max(0, poweredOn['zero_g_lab'] ?? 0),
    Math.max(0, capacity - waterFreighter),
  );
  return { capacity, waterFreighter, zeroGLab };
}

export type GrapheneFeedstockId = 'Lumber' | 'Coal' | 'Oil';

export interface GrapheneModifier {
  label: string;
  multiplier: number;
}

export interface GrapheneInputResult {
  resource: GrapheneFeedstockId;
  requestedLines: number;
  allocatedLines: number;
  effectiveLines: number;
  amountPerLine: number;
  consumption: number;
}

export interface GrapheneTickResult {
  requestedLines: number;
  allocatedLines: number;
  effectiveLines: number;
  maxLines: number;
  supportedLines: number;
  efficiency: number;
  baseRate: number;
  requestedBaseOutput: number;
  allocatedBaseOutput: number;
  materialBaseOutput: number;
  inputs: GrapheneInputResult[];
  modifiers: GrapheneModifier[];
  theoreticalOutput: number;
}

export interface TruepathProductionOptions {
  productionModifiers?: GrapheneModifier[];
  dischargeActive?: boolean;
  activeCitadels?: number;
  activeElectrolysis?: number;
  activeWaterFreighters?: number;
  activeFob?: number;
}

export interface TruepathProductionResult {
  graphene?: GrapheneTickResult;
  triton?: TritonOperationResult;
}

export interface TritonOperationResult {
  requestedFob: number;
  poweredFob: number;
  activeFob: number;
  requestedLanders: number;
  troopLimitedLanders: number;
  activeLanders: number;
  troopsPerLander: number;
  deployedTroops: number;
  fobHeliumPerTick: number;
  landerOilPerTick: number;
  heliumConsumption: number;
  oilConsumption: number;
  control: number;
  cipherBaseOutput: number;
  cipherModifiers: GrapheneModifier[];
  cipherOutput: number;
}

export interface TritonWarResult {
  enemyBefore: number;
  enemyAfter: number;
  controlBefore: number;
  controlAfter: number;
  kills: number;
  deaths: number;
  wounded: number;
  completed: boolean;
}

const GRAPHENE_INPUT_RATES: Record<GrapheneFeedstockId, number> = {
  Lumber: 350,
  Coal: 25,
  Oil: 15,
};
const GRAPHENE_ALLOCATION_ORDER: GrapheneFeedstockId[] = ['Oil', 'Coal', 'Lumber'];
const TRUEPATH_AUTO_ON_BUILDINGS = new Set([
  'titan_spaceport',
  'electrolysis',
  'titan_quarters',
  'titan_mine',
  'g_factory',
  'water_freighter',
  'zero_g_lab',
  'orichalcum_mine',
  'elerium_mine',
  'uranium_mine',
  'neutronium_mine',
  'lander',
]);

const TRITON_FOB_HELIUM_PER_TICK = 125 * 2.5;
const TRITON_LANDER_OIL_PER_TICK = 50 * 2.5;
const TRITON_CIPHER_PER_LANDER = 0.005;

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

function highPopulationMultiplier(state: GameState): number {
  const rank = raceRank(state, 'high_pop');
  return rank ? getTraitVar('high_pop', 1, rank) / 100 : 1;
}

function jobScaleValue(state: GameState, value: number): number {
  const rank = raceRank(state, 'high_pop');
  return rank ? value * getTraitVar('high_pop', 0, rank) : value;
}

function configuredOn(state: GameState, id: string): number {
  const structure = state.space[id] as { count?: number; on?: number } | undefined;
  if (!structure) return 0;
  return Math.min(
    Math.max(0, structure.count ?? 0),
    Math.max(0, structure.on ?? structure.count ?? 0),
  );
}

function calculateTritonOperations(
  state: GameState,
  timeMul: number,
  options: TruepathProductionOptions,
): TritonOperationResult | undefined {
  const fob = state.space['fob'] as { count?: number; on?: number; troops?: number; active?: number } | undefined;
  const lander = state.space['lander'] as { count?: number; on?: number; active?: number } | undefined;
  const crashedShip = state.space['crashed_ship'] as { count?: number } | undefined;
  if (!fob || !lander || !crashedShip) return undefined;

  const requestedFob = configuredOn(state, 'fob');
  const poweredFob = Math.min(requestedFob, Math.max(0, options.activeFob ?? requestedFob));
  const heliumPerFob = TRITON_FOB_HELIUM_PER_TICK;
  const heliumAvailable = Math.max(0, state.resource['Helium_3']?.amount ?? 0);
  const activeFob = heliumPerFob > 0
    ? Math.min(poweredFob, Math.floor((heliumAvailable + 1e-12) / (heliumPerFob * timeMul)))
    : poweredFob;

  const requestedLanders = activeFob > 0 ? configuredOn(state, 'lander') : 0;
  const troopsPerLander = jobScaleValue(state, 3);
  const availableTroops = Math.max(0, garrisonSize(state));
  const troopLimitedLanders = troopsPerLander > 0
    ? Math.min(requestedLanders, Math.floor(availableTroops / troopsPerLander))
    : requestedLanders;
  const oilPerLander = TRITON_LANDER_OIL_PER_TICK;
  const oilAvailable = Math.max(0, state.resource['Oil']?.amount ?? 0);
  const activeLanders = oilPerLander > 0
    ? Math.min(troopLimitedLanders, Math.floor((oilAvailable + 1e-12) / (oilPerLander * timeMul)))
    : troopLimitedLanders;
  const deployedTroops = activeLanders * troopsPerLander;
  const heliumConsumption = activeFob * heliumPerFob * timeMul;
  const oilConsumption = activeLanders * oilPerLander * timeMul;

  fob.active = activeFob;
  fob.troops = deployedTroops;
  lander.active = activeLanders;

  const control = Math.max(0, Math.min(100, crashedShip.count ?? 0));
  const cipherBaseOutput = !state.tech['isolation'] && control >= 100
    ? activeLanders * TRITON_CIPHER_PER_LANDER * timeMul
    : 0;
  const cipherModifiers: GrapheneModifier[] = cipherBaseOutput > 0
    ? [
      ...(options.productionModifiers ?? []),
      { label: '海卫一辛迪加压力', multiplier: getSyndicateProductionMultiplier(state, 'triton') },
    ].filter(({ multiplier }) => Math.abs(multiplier - 1) >= 1e-12)
    : [];
  const cipherOutput = cipherModifiers.reduce(
    (output, modifier) => output * modifier.multiplier,
    cipherBaseOutput,
  );

  return {
    requestedFob,
    poweredFob,
    activeFob,
    requestedLanders,
    troopLimitedLanders,
    activeLanders,
    troopsPerLander,
    deployedTroops,
    fobHeliumPerTick: TRITON_FOB_HELIUM_PER_TICK,
    landerOilPerTick: TRITON_LANDER_OIL_PER_TICK,
    heliumConsumption,
    oilConsumption,
    control,
    cipherBaseOutput,
    cipherModifiers,
    cipherOutput,
  };
}

function randomInteger(random: () => number, min: number, maxExclusive: number): number {
  if (maxExclusive <= min) return min;
  return min + Math.floor(random() * (maxExclusive - min));
}

/** 原版 long-loop 海卫一战斗：每日推进一次坠毁飞船控制度。 */
export function tritonWarTick(state: GameState, random: () => number = Math.random): TritonWarResult | null {
  const fob = state.space['fob'] as { count?: number; troops?: number; enemy?: number } | undefined;
  const crashedShip = state.space['crashed_ship'] as { count?: number } | undefined;
  if (!fob || !crashedShip || (state.tech['triton'] ?? 0) < 3) return null;

  const garrison = state.civic.garrison;
  const enemyBefore = Math.max(0, fob.enemy ?? 0);
  const controlBefore = Math.max(0, Math.min(100, crashedShip.count ?? 0));
  let enemy = enemyBefore;
  if (enemy <= 1_000) {
    enemy += randomInteger(random, 25, (state.tech['outer'] ?? 0) >= 4 ? 125 : 100);
  }

  const troops = Math.max(0, fob.troops ?? 0);
  const woundCap = Math.ceil(jobScaleValue(state, enemy) / 5);
  const availableAwayFromFob = Math.max(0, garrison.workers - garrison.crew - troops);
  const excessWounded = Math.max(0, garrison.wounded - availableAwayFromFob);
  const defense = armyRating(troops, state, excessWounded);
  const deaths = Math.min(
    Math.max(0, garrison.workers),
    randomInteger(random, 0, Math.floor(excessWounded) + 1),
  );
  garrison.workers = Math.max(0, garrison.workers - deaths);
  garrison.wounded = Math.max(0, garrison.wounded - deaths);

  const kills = Math.min(enemy, randomInteger(random, 0, Math.floor(defense) + 1));
  enemy = Math.max(0, enemy - kills);

  let wounded = Math.min(randomInteger(random, 0, Math.floor(troops) + 1), woundCap);
  if (state.race['armored']) wounded -= jobScaleValue(state, 1);
  if (state.race['scales']) wounded -= jobScaleValue(state, 1);
  if (state.tech['armor']) wounded -= jobScaleValue(state, state.tech['armor']);
  wounded = Math.max(0, wounded);

  if (state.race['revive'] && deaths > 0) {
    garrison.workers += randomInteger(random, 0, deaths + 1);
  }
  garrison.wounded = Math.min(
    Math.max(0, garrison.workers - garrison.crew),
    garrison.wounded + wounded,
  );

  const remainingAwayFromFob = Math.max(0, garrison.workers - garrison.crew - troops);
  const remainingExcessWounded = Math.max(0, garrison.wounded - remainingAwayFromFob);
  const danger = enemy - armyRating(troops, state, remainingExcessWounded);
  let controlAfter = controlBefore;
  if (danger <= 0 && controlAfter < 100) controlAfter++;
  else if (danger > 0 && controlAfter > 0) controlAfter--;

  fob.enemy = enemy;
  crashedShip.count = controlAfter;
  if (controlAfter >= 100) state.resource['Cipher'].display = true;

  return {
    enemyBefore,
    enemyAfter: enemy,
    controlBefore,
    controlAfter,
    kills,
    deaths,
    wounded,
    completed: controlBefore < 100 && controlAfter >= 100,
  };
}

function truepathGrapheneRate(state: GameState): number {
  if (state.tech['isolation']) return 1.8;
  const colonists = (state.civic['titan_colonist'] as { workers?: number } | undefined)?.workers ?? 0;
  let aiColonists = (state.space['ai_colonist'] as { on?: number } | undefined)?.on ?? 0;
  const highPopRank = raceRank(state, 'high_pop');
  if (highPopRank) aiColonists *= getTraitVar('high_pop', 0, highPopRank);
  return 0.05 * (colonists + aiColonists) * highPopulationMultiplier(state);
}

function normalizeGrapheneFactory(state: GameState): GrapheneFactoryState | undefined {
  const factory = state.space['g_factory'] as Partial<GrapheneFactoryState> | undefined;
  if (!factory) return undefined;
  factory.count = Math.max(0, factory.count ?? 0);
  factory.on = Math.min(factory.count, Math.max(0, factory.on ?? factory.count));
  const hadAllocations = factory.Lumber !== undefined || factory.Coal !== undefined || factory.Oil !== undefined;
  factory.Lumber = Math.max(0, factory.Lumber ?? 0);
  factory.Coal = Math.max(0, factory.Coal ?? 0);
  factory.Oil = Math.max(0, factory.Oil ?? 0);
  if (!hadAllocations && factory.on > 0) {
    if (state.race['kindling_kindred'] || state.race['smoldering']) factory.Oil = factory.on;
    else factory.Lumber = factory.on;
  }
  if (state.race['kindling_kindred'] || state.race['smoldering']) factory.Lumber = 0;
  return factory as GrapheneFactoryState;
}

export function getGrapheneFactory(state: GameState): GrapheneFactoryState | undefined {
  return normalizeGrapheneFactory(state);
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function assignGrapheneFeedstock(
  state: GameState,
  resource: GrapheneFeedstockId,
): GameState | null {
  if (resource === 'Lumber' && (state.race['kindling_kindred'] || state.race['smoldering'])) return null;
  const next = cloneState(state);
  const factory = normalizeGrapheneFactory(next);
  if (!factory) return null;
  const assigned = factory.Lumber + factory.Coal + factory.Oil;
  if (assigned >= factory.on) return null;
  factory[resource] += 1;
  return next;
}

export function removeGrapheneFeedstock(
  state: GameState,
  resource: GrapheneFeedstockId,
): GameState | null {
  const next = cloneState(state);
  const factory = normalizeGrapheneFactory(next);
  if (!factory || factory[resource] <= 0) return null;
  factory[resource] -= 1;
  return next;
}

function activeElectrolysisForTick(
  state: GameState,
  timeMul: number,
  poweredOn?: number,
): number {
  const electrolysis = state.space['electrolysis'] as { count?: number; on?: number } | undefined;
  const requested = Math.max(0, electrolysis?.on ?? electrolysis?.count ?? 0);
  const powered = Math.min(requested, Math.max(0, poweredOn ?? requested));
  const waterPerPlant = 35 * timeMul;
  const availableWater = Math.max(0, state.resource.Water?.amount ?? 0);
  return waterPerPlant > 0
    ? Math.min(powered, Math.floor((availableWater + 1e-12) / waterPerPlant))
    : 0;
}

function titanGrapheneSupport(state: GameState, requested: number, activeElectrolysis: number): number {
  const aiCore = state.space['ai_core2'] as { on?: number } | undefined;
  const supportPerPlant = (state.tech['titan_ai_core'] ?? 0) >= 2 && (aiCore?.on ?? 0) > 0 ? 3 : 2;
  const supportCapacity = activeElectrolysis * supportPerPlant;
  const earlierConsumers = ['titan_quarters', 'titan_mine'].reduce((sum, id) => {
    const building = state.space[id] as { on?: number } | undefined;
    return sum + Math.max(0, building?.on ?? 0);
  }, 0);
  return Math.min(requested, Math.max(0, supportCapacity - earlierConsumers));
}

function calculateGrapheneTick(
  state: GameState,
  timeMul: number,
  options: TruepathProductionOptions,
  activeElectrolysis: number,
): GrapheneTickResult | undefined {
  const factory = normalizeGrapheneFactory(state);
  if (!factory || factory.count <= 0) return undefined;

  const maxLines = Math.max(0, factory.on);
  const supportedLines = titanGrapheneSupport(state, maxLines, activeElectrolysis);
  const efficiency = maxLines > 0 ? supportedLines / maxLines : 0;
  let remaining = maxLines;
  let requestedLines = 0;
  let allocatedLines = 0;
  let effectiveLines = 0;
  const inputs: GrapheneInputResult[] = [];

  for (const resource of GRAPHENE_ALLOCATION_ORDER) {
    const requested = Math.max(0, factory[resource]);
    const allocated = Math.min(requested, remaining);
    factory[resource] = allocated;
    remaining -= allocated;
    requestedLines += requested;
    allocatedLines += allocated;

    const amountPerLine = GRAPHENE_INPUT_RATES[resource] * efficiency * timeMul;
    const available = Math.max(0, state.resource[resource]?.amount ?? 0);
    const materialLines = amountPerLine > 0
      ? Math.min(allocated, Math.floor((available + 1e-12) / amountPerLine))
      : 0;
    const consumption = materialLines * amountPerLine;
    effectiveLines += materialLines;
    inputs.push({
      resource,
      requestedLines: requested,
      allocatedLines: allocated,
      effectiveLines: materialLines,
      amountPerLine,
      consumption,
    });
  }

  const baseRate = truepathGrapheneRate(state);
  const requestedBaseOutput = requestedLines * baseRate * timeMul;
  const allocatedBaseOutput = allocatedLines * baseRate * timeMul;
  const materialBaseOutput = effectiveLines * baseRate * timeMul;
  const quantumLevel = calculateQuantumLevel(state, options.activeCitadels);
  const quantumStep = Number((quantumLevel / 5).toFixed(1)) / 100;
  const activeCitadels = options.activeCitadels
    ?? (state.interstellar['citadel'] as { on?: number } | undefined)?.on
    ?? 0;
  const modifiers: GrapheneModifier[] = [
    { label: '灵能生产增益', multiplier: getPsychicProductionMultiplier(state, 'Graphene') },
    { label: '政体制造效率', multiplier: getFactoryOutputMultiplier(state) },
    { label: '土卫六支援效率', multiplier: efficiency },
    {
      label: 'AI 核心量子计算',
      multiplier: (state.tech['ai_core'] ?? 0) >= 3 ? 1 + quantumStep * activeCitadels : 1,
    },
    { label: '辛迪加压力', multiplier: getSyndicateProductionMultiplier(state, 'titan') },
    { label: '金字塔神庙', multiplier: zigguratBonus(state) },
    ...(options.productionModifiers ?? []),
    { label: '电磁放电', multiplier: options.dischargeActive ? 0.5 : 1 },
  ].filter(({ multiplier }) => Math.abs(multiplier - 1) >= 1e-12);
  const theoreticalOutput = modifiers.reduce(
    (output, modifier) => output * modifier.multiplier,
    materialBaseOutput,
  );

  return {
    requestedLines,
    allocatedLines,
    effectiveLines,
    maxLines,
    supportedLines,
    efficiency,
    baseRate,
    requestedBaseOutput,
    allocatedBaseOutput,
    materialBaseOutput,
    inputs,
    modifiers,
    theoreticalOutput,
  };
}

/**
 * Truepath 建筑产出 tick
 */
export function truepathProductionTick(
  state: GameState,
  timeMul: number,
  deltas: Record<string, number>,
  options: TruepathProductionOptions = {},
): TruepathProductionResult {
  if (!isTruepath(state)) return {};
  const space = state.space as Record<string, Record<string, number>>;

  const titanMul = getSyndicateProductionMultiplier(state, 'titan');
  const enceladusMul = getSyndicateProductionMultiplier(state, 'enceladus');
  const tritonMul = getSyndicateProductionMultiplier(state, 'triton');
  const kuiperMul = getSyndicateProductionMultiplier(state, 'kuiper');
  const erisMul = getSyndicateProductionMultiplier(state, 'eris');

  // Titan / electrolysis：供电且水量充足时提供区域支援。
  const electroOn = activeElectrolysisForTick(state, timeMul, options.activeElectrolysis);
  if (electroOn > 0) {
    deltas['Water'] = (deltas['Water'] ?? 0) - electroOn * 35 * timeMul;
  }
  // 标记下面所有产出受 syndicate 影响
  void enceladusMul; void tritonMul; void kuiperMul; void erisMul;

  // Titan / titan_mine 矿产
  const tmineOn = space['titan_mine']?.['on'] ?? 0;
  if (tmineOn > 0) {
    deltas['Adamantite'] = (deltas['Adamantite'] ?? 0) + tmineOn * 0.5 * timeMul * titanMul;
  }

  // Titan / g_factory：按原料分配制造 Graphene。
  const graphene = calculateGrapheneTick(state, timeMul, options, electroOn);
  if (graphene) {
    for (const input of graphene.inputs) {
      if (input.consumption > 0) {
        deltas[input.resource] = (deltas[input.resource] ?? 0) - input.consumption;
      }
    }
    if (graphene.theoreticalOutput > 0) {
      deltas['Graphene'] = (deltas['Graphene'] ?? 0) + graphene.theoreticalOutput;
    }
  }

  // Enceladus / water_freighter 产出 Water
  const waterOn = options.activeWaterFreighters ?? space['water_freighter']?.['on'] ?? 0;
  if (waterOn > 0) {
    deltas['Water'] = (deltas['Water'] ?? 0) + waterOn * 5 * timeMul * enceladusMul;
  }

  // Triton / FOB + lander：电力、氦-3、士兵与石油共同限制前线运行。
  const triton = calculateTritonOperations(state, timeMul, options);
  if (triton) {
    if (triton.heliumConsumption > 0) {
      deltas['Helium_3'] = (deltas['Helium_3'] ?? 0) - triton.heliumConsumption;
    }
    if (triton.oilConsumption > 0) {
      deltas['Oil'] = (deltas['Oil'] ?? 0) - triton.oilConsumption;
    }
    if (triton.cipherOutput > 0) {
      deltas['Cipher'] = (deltas['Cipher'] ?? 0) + triton.cipherOutput;
    }
  }

  // Kuiper / orichalcum_mine / elerium_mine / uranium_mine / neutronium_mine
  const oricOn = space['orichalcum_mine']?.['on'] ?? 0;
  if (oricOn > 0) deltas['Orichalcum'] = (deltas['Orichalcum'] ?? 0) + oricOn * 0.2 * timeMul * kuiperMul;
  const eleOn = space['elerium_mine']?.['on'] ?? 0;
  if (eleOn > 0) deltas['Elerium'] = (deltas['Elerium'] ?? 0) + eleOn * 0.04 * timeMul * kuiperMul;
  const uraOn = space['uranium_mine']?.['on'] ?? 0;
  if (uraOn > 0) deltas['Uranium'] = (deltas['Uranium'] ?? 0) + uraOn * 0.3 * timeMul * kuiperMul;
  const neuOn = space['neutronium_mine']?.['on'] ?? 0;
  if (neuOn > 0) deltas['Neutronium'] = (deltas['Neutronium'] ?? 0) + neuOn * 0.15 * timeMul * kuiperMul;
  return { graphene, triton };
}

/** 完整 retirement 触发条件（对标 truepath.js L3924）*/
export function canRetire(state: GameState): boolean {
  return Boolean(state.tech['m_brain']) &&
    Boolean(state.tech['m_ignite'] && (state.tech['m_ignite'] as number) >= 2);
}

/** 工具：按区域获取所有建筑 */
export function getTruepathBuildingsByRegion(region: TruepathRegionId): TruepathBuildingDef[] {
  return TRUEPATH_BUILDINGS.filter((b) => b.region === region);
}

/** 工具：计算 Truepath 建筑成本 */
export function getTruepathBuildCost(state: GameState, buildingId: string): Record<string, number> | null {
  const building = TRUEPATH_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return null;
  const space = state.space as Record<string, Record<string, number>>;
  const count = space[buildingId]?.['count'] ?? 0;
  const mult = Math.pow(building.costMult, count);
  const cost: Record<string, number> = {};
  for (const [res, base] of Object.entries(building.baseCost)) {
    cost[res] = Math.round(base * mult);
  }
  if (buildingId === 'fob' && state.race['hooved'] && count < 1) cost['Horseshoe'] = 10;
  return applyInflationToCosts(state, cost);
}

/** 判断 Truepath 建筑是否可建造 */
export function canBuildTruepath(state: GameState, buildingId: string): boolean {
  if (!isTruepath(state)) return false;
  const building = TRUEPATH_BUILDINGS.find((b) => b.id === buildingId);
  if (!building || building.buildable === false) return false;
  for (const [tech, lvl] of Object.entries(building.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  const count = (state.space[buildingId] as { count?: number } | undefined)?.count ?? 0;
  if (building.maxCount !== undefined && count >= building.maxCount) return false;
  const cost = getTruepathBuildCost(state, buildingId);
  if (!cost) return false;
  for (const [res, amt] of Object.entries(cost)) {
    if ((state.resource[res]?.amount ?? 0) < amt) return false;
  }
  return true;
}

/** 建造 Truepath 建筑 */
export function buildTruepathStructure(state: GameState, buildingId: string): boolean {
  if (!canBuildTruepath(state, buildingId)) return false;
  const building = TRUEPATH_BUILDINGS.find((candidate) => candidate.id === buildingId)!;
  const cost = getTruepathBuildCost(state, buildingId)!;
  for (const [res, amt] of Object.entries(cost)) {
    if (state.resource[res]) state.resource[res].amount -= amt;
  }
  const space = state.space as Record<string, Record<string, number>>;
  if (!space[buildingId]) {
    space[buildingId] = buildingId === 'g_factory'
      ? { count: 0, on: 0, Lumber: 0, Coal: 0, Oil: 0 }
      : { count: 0, on: 0 };
  }
  space[buildingId].count++;
  if (TRUEPATH_AUTO_ON_BUILDINGS.has(buildingId) || building.power > 0) {
    space[buildingId].on = (space[buildingId].on ?? 0) + 1;
  }
  if (buildingId === 'g_factory') {
    const factory = normalizeGrapheneFactory(state)!;
    if (state.race['kindling_kindred'] || state.race['smoldering']) factory.Oil += 1;
    else factory.Lumber += 1;
    state.resource.Graphene.display = true;
    state.settings.showIndustry = true;
  }
  if (buildingId === 'storehouse') {
    delete space[buildingId].on;
    for (const resourceId of TRUEPATH_STOREHOUSE_RESOURCES) {
      const added = getTruepathStorehouseStorageBonus(state, resourceId, 1);
      if (added > 0) state.resource[resourceId].max = Math.max(0, state.resource[resourceId].max) + added;
    }
  }
  if (building.grant) {
    const [tech, level] = building.grant;
    state.tech[tech] = Math.max(state.tech[tech] ?? 0, level);
  }
  if (buildingId === 'fob') {
    Object.assign(space[buildingId], { count: 1, on: 1, active: 0, troops: 0, enemy: 0 });
    space['lander'] ??= { count: 0, on: 0, active: 0 };
    space['crashed_ship'] ??= { count: 0 };
    if (state.tech['triton'] === 2) state.tech['triton'] = 3;
  }
  if (buildingId === 'lander') space[buildingId].active ??= 0;
  addInflationPoints(state, 1);
  return true;
}
