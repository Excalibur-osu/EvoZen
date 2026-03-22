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
  | 'Crates'
  | 'Containers'
  | 'Plywood'
  | 'Brick'
  | 'Wrought_Iron'
  | 'Steel'
  | 'Aluminium'
  | 'Sheet_Metal';

/** 特殊/进化阶段资源 */
export type EvoResourceId = 'RNA' | 'DNA';

export type ResourceId = BasicResourceId | EvoResourceId | string;

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
  | 'mine'
  | 'coal_mine'
  | 'bank'
  | 'temple'
  | 'university'
  | 'wardenclyffe'
  | 'smelter'
  | 'metal_refinery'
  | 'storage_yard'
  | 'warehouse'
  | 'amphitheatre';

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

export interface CivicState {
  taxes: TaxState;
  govern: GovState;
  foreign: {
    gov0: ForeignGovState;
    gov1: ForeignGovState;
    gov2: ForeignGovState;
  };
  d_job: string;
  /** 各岗位的状态 */
  [jobId: string]: JobState | TaxState | GovState | string | unknown;
}

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
  achieve?: Record<string, { l: number; a?: number; e?: number }>;
  [key: string]: unknown;
}

// ============================================================
// 事件 (Event)
// ============================================================

export interface EventState {
  t: number;
  l: boolean;
}

// ============================================================
// 进化 (Evolution)
// ============================================================

export interface EvolutionState {
  [structureId: string]: {
    count: number;
    [key: string]: unknown;
  };
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

export interface CityState {
  calendar: CalendarState;
  biome: string;
  ptrait: string;
  geology: Record<string, number>;
  market: { active: boolean };
  /** 建筑 */
  [structureId: string]: StructureState | CalendarState | string | Record<string, number> | unknown;
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
}

// ============================================================
// 存档 (Save)
// ============================================================

export interface SaveData {
  gameState: GameState;
  timestamp: number;
  version: string;
}
