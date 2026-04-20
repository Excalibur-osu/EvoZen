/**
 * EvoZen 共享类型定义
 * 从旧版 src/vars.js 的 global 对象结构提取
 * 第一阶段只包含基础内容
 */

// ============================================================
// 资源 (Resource)
// ============================================================

/** 资源名称 — 第一阶段只关注基础资源 */
export type BasicResourceId =
  | 'Money'
  | 'Food'
  | 'Lumber'
  | 'Stone'
  | 'Furs'
  | 'Copper'
  | 'Iron'
  | 'Cement'
  | 'Coal'
  | 'Knowledge'
  | 'Faith'
  | 'Crates'
  | 'Containers'
  | 'Plywood'
  | 'Brick'
  | 'Wrought_Iron'
  | 'Steel'
  | 'Aluminium'
  | 'Oil'
  | 'Titanium'
  | 'Uranium'
  | 'Sheet_Metal'
  | 'Alloy'
  | 'Polymer';

/** 特殊/进化阶段资源 */
export type EvoResourceId = 'RNA' | 'DNA';

/** 空间阶段关键资源 */
export type SpaceResourceId = 'Iridium' | 'Helium_3' | 'Mythril';

export type ResourceId = BasicResourceId | EvoResourceId | SpaceResourceId | string;

/** 单个资源的状态 */
export interface ResourceState {
  name: string;
  display: boolean;
  value: number;
  amount: number;
  max: number;
  rate: number;
  crates: number;
  containers?: number;
  diff: number;
  delta: number;
  trade?: number;
}

// ============================================================
// 建筑 / 结构 (Structure)
// ============================================================

export type BasicStructureId =
  | 'basic_housing'
  | 'cottage'
  | 'farm'
  | 'mill'
  | 'silo'
  | 'smokehouse'
  | 'shed'
  | 'lumber_yard'
  | 'rock_quarry'
  | 'cement_plant'
  | 'foundry'
  | 'trade_post'
  | 'library'
  | 'garrison'
  | 'sawmill'
  | 'hospital'
  | 'boot_camp'
  | 'mine'
  | 'coal_mine'
  | 'bank'
  | 'temple'
  | 'shrine'
  | 'university'
  | 'wardenclyffe'
  | 'smelter'
  | 'metal_refinery'
  | 'storage_yard'
  | 'warehouse'
  | 'amphitheatre'
  | 'oil_well'
  | 'oil_depot'
  | 'coal_power'
  | 'oil_power'
  | 'fission_power';

/** 单个建筑的状态 */
export interface StructureState {
  count: number;
  on?: number;
  /** 某些建筑有额外字段 */
  [key: string]: unknown;
}

// ============================================================
// 科技 (Tech)
// ============================================================

/** 科技解锁状态：键是科技 ID，值是解锁等级 */
export type TechState = Record<string, number>;

// ============================================================
// 岗位 / 工人 (Job)
// ============================================================

export type BasicJobId =
  | 'unemployed'
  | 'hunter'
  | 'farmer'
  | 'lumberjack'
  | 'quarry_worker'
  | 'miner'
  | 'coal_miner'
  | 'craftsman'
  | 'cement_worker'
  | 'banker'
  | 'entertainer'
  | 'professor'
  | 'scientist'
  | 'priest';

/** 单个岗位的状态 */
export interface JobState {
  job: string;
  display: boolean;
  workers: number;
  max: number;
  impact: number;
  assigned?: number;
  stress?: number;
  name?: string;
}

// ============================================================
// 士气 (Morale)
// ============================================================

/** 士气分项数据 — 对标 morale.ts calculateMorale() breakdown */
export interface MoraleState {
  /** 最终有效士气 */
  current: number;
  /** 士气上限 */
  cap: number;
  /** 压力惩罚（负值） */
  stress: number;
  /** 娱乐加成 */
  entertain: number;
  /** 季节加成 */
  season: number;
  /** 天气加成 */
  weather: number;
  /** 失业惩罚（负值） */
  unemployed: number;
}

// ============================================================
// 市政 (Civic)
// ============================================================

export interface TaxState {
  tax_rate: number;
}

export interface GovState {
  type: string;
  rev: number;
  fr: number;
}

export interface ForeignGovState {
  unrest: number;
  hstl: number;
  mil: number;
  eco: number;
  spy: number;
  esp: number;
  trn: number;
  sab: number;
  act: string;
  occ: boolean;
  anx: boolean;
  buy: boolean;
}

/** 驻军状态 — 对标 legacy commisionGarrison */
export interface GarrisonState {
  display: boolean;
  disabled: boolean;
  /** 当前训练速率 */
  rate: number;
  /** 训练进度 0-100 */
  progress: number;
  /** 医疗恢复累计进度 */
  heal_progress?: number;
  /** 战术等级 0-4 (ambush/raid/pillage/assault/siege) */
  tactic: number;
  /** 当前士兵数 */
  workers: number;
  /** 受伤士兵数 */
  wounded: number;
  /** 出征人数 */
  raid: number;
  /** 士兵上限 */
  max: number;
  /** 是否解锁雇佣兵 */
  mercs: boolean;
  /** 战争疲劳 */
  fatigue: number;
  /** 厌战抗议 */
  protest: number;
  /** 已雇佣佣兵计数（影响佣兵价格递增） */
  m_use: number;
  /** 船员数（后续 space 阶段用） */
  crew: number;
}

export interface TradeRoute {
  resource: string;
  action: 'buy' | 'sell' | 'none';
  qty: number;
}

export interface MarketState {
  active: boolean;
  qty?: number;
}

export interface CivicState {
  taxes: TaxState;
  govern: GovState;
  garrison: GarrisonState;
  foreign: {
    gov0: ForeignGovState;
    gov1: ForeignGovState;
    gov2: ForeignGovState;
  };
  d_job: string;
  /** 各岗位的状态 */
  [jobId: string]: JobState | TaxState | GovState | GarrisonState | string | unknown;
}

// ============================================================
// 工厂 (Factory)
// ============================================================

/** 工厂产线分配状态 — 对标 legacy global.city.factory */
export interface FactoryState {
  count: number;
  /** 已通电的工厂数 */
  on: number;
  /** 分配给合金产线的工厂数 */
  Alloy: number;
  /** 分配给聚合物产线的工厂数 */
  Polymer: number;
  /** 分配给奢侈品产线的工厂数 */
  Lux: number;
  /** 分配给合成毛皮产线的工厂数（需 synthetic_fur 科技） */
  Furs: number;
}

// ============================================================
// 熔炉 (Smelter)
// ============================================================

/** 熔炉燃料分配与产出分配状态 — 对标 legacy global.city.smelter */
export interface SmelterState {
  count: number;
  on: number;
  // 燃料分配槽位 (Fuel allocations)
  Wood: number;
  Coal: number;
  Oil: number;
  Inferno: number;
  // 产出分配槽位 (Production allocations)
  Iron: number;
  Steel: number;
  Iridium: number;
}

export type SmelterFuelId = 'Wood' | 'Coal' | 'Oil' | 'Inferno';
export type SmelterOutputId = 'Iron' | 'Steel' | 'Iridium';
export type SmelterAllocationId = SmelterFuelId | SmelterOutputId;

// ============================================================
// 种族 (Race)
// ============================================================

export interface RaceState {
  species: string;
  gods: string;
  old_gods?: string;
  Plasmid?: { count: number; anti: number };
  [trait: string]: unknown;
}

// ============================================================
// 统计 (Stats)
// ============================================================

export interface StatsState {
  start: number;
  days: number;
  tdays: number;
  reset?: number;
  mad?: number;
  bioseed?: number;
  blackhole?: number;
  portals?: number;
  /** 发起战役次数 */
  attacks: number;
  /** 阵亡士兵总数 */
  died: number;
  achieve?: Record<string, { l: number; a?: number; e?: number }>;
  [key: string]: unknown;
}

// ============================================================
// 事件 (Event)
// ============================================================

export interface EventState {
  t: number;
  /** 上次触发的事件 ID（false = 尚未触发） */
  l: string | boolean;
}

// ============================================================
// 进化 (Evolution)
// ============================================================

export interface EvolutionState {
  [key: string]: {
    count: number;
    [key: string]: unknown;
  } | number | boolean | undefined;
}

// ============================================================
// 设置 (Settings)
// ============================================================

export interface SettingsState {
  theme: string;
  locale: string;
  affix: string;
  icon: string;
  font: string;
  civTabs: number;
  spaceTabs: number;
  govTabs: number;
  resTabs: number;
  statsTabs: number;
  marketTabs: number;
  animated: boolean;
  tabLoad: boolean;
  pause: boolean;
  showEvolution: boolean;
  showCity: boolean;
  showCivic: boolean;
  showResources: boolean;
  showMarket: boolean;
  showStorage: boolean;
  showIndustry: boolean;
  showPowerGrid: boolean;
  showMil: boolean;
  q_merge: string;
  queuestyle: string;
  q_resize: string;
  [key: string]: unknown;
}

// ============================================================
// 队列 (Queue)
// ============================================================

export interface QueueItem {
  id: string;
  action: string;
  type: string;
  label: string;
  q: number;
  qs: number;
  time: number;
  t_max: number;
  cost?: Record<string, number>;
  progress?: Record<string, number>;
}

export interface QueueState {
  display: boolean;
  queue: QueueItem[];
}

// ============================================================
// 城市 (City) 状态
// ============================================================

export interface CalendarState {
  day: number;
  year: number;
  season: number;
  weather: number;
  temp: number;
  moon: number;
  wind: number;
  orbit: number;
  /** 内部计数器：fast tick → day 推进（每 20 tick = 1 天） */
  dayTick?: number;
}

/** 士气系统状态 — 对标 legacy global.city.morale */
export interface MoraleState {
  /** 当前有效士气（clamp后） */
  current: number;
  /** 士气上限 */
  cap: number;
  /** 压力贡献（负值） */
  stress: number;
  /** 娱乐贡献 */
  entertain: number;
  /** 季节贡献 */
  season: number;
  /** 天气贡献 */
  weather: number;
  /** 失业惩罚（负值） */
  unemployed: number;
}

/** 电力网格状态 */
export interface PowerState {
  /** 总发电量 (MW) */
  generated: number;
  /** 总耗电量 (MW) */
  consumed: number;
  /** 净余电力 (MW) */
  surplus: number;
}

export interface CityState {
  calendar: CalendarState;
  biome: string;
  ptrait: string;
  geology: Record<string, number>;
  market?: MarketState;
  trade_routes?: TradeRoute[];
  morale?: MoraleState;
  power?: PowerState;
  smelter?: SmelterState;
  /** 建筑 */
  [structureId: string]:
    | StructureState
    | CalendarState
    | MoraleState
    | PowerState
    | SmelterState
    | MarketState
    | TradeRoute[]
    | string
    | Record<string, number>
    | unknown;
}

// ============================================================
// 全局游戏状态 (GameState)
// ============================================================

export interface GameState {
  seed: number;
  warseed: number;
  version: string;

  resource: Record<string, ResourceState>;
  evolution: EvolutionState;
  tech: TechState;
  city: CityState;
  arpa?: Record<string, unknown>;
  space: Record<string, StructureState>;
  interstellar: Record<string, StructureState>;
  portal: Record<string, StructureState>;
  eden: Record<string, StructureState>;
  tauceti: Record<string, StructureState>;
  civic: CivicState;
  race: RaceState;
  genes: Record<string, number>;
  blood: Record<string, number>;
  stats: StatsState;
  settings: SettingsState;
  event: EventState;
  m_event: EventState;
  queue: QueueState;
  r_queue: QueueState;

  /** 威望系统 */
  prestige: {
    Plasmid: { count: number };
    [key: string]: unknown;
  };

  [key: string]: unknown;
}

// ============================================================
// 游戏 Tick / 循环
// ============================================================

export interface GameTickResult {
  /** 本 tick 各资源的产量变化 */
  resourceDeltas: Record<string, number>;
  /** 消息队列 */
  messages: GameMessage[];
}

export interface GameMessage {
  text: string;
  type: 'info' | 'warning' | 'success' | 'danger' | 'special';
  category: string;
  timestamp?: string;
}

// ============================================================
// 存档 (Save)
// ============================================================

export interface SaveData {
  gameState: GameState;
  timestamp: number;
  version: string;
}
