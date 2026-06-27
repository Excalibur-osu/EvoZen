/**
 * 总督系统 (Governor) — 对标 legacy/src/governor.js
 *
 * 总督是一种自动化助手，会按玩家配置自动执行特定任务。
 * 解锁条件：基因 governor + 科技 governor
 *
 * 包含：
 *   - 10 种背景（gmen）— 每种带 1-3 个 trait
 *   - 22 种 trait（gov_traits）— rank=true(高级)/false(基础)
 *   - 13 种自动化任务（gov_tasks）
 *   - 各 genus 总督候选名字池
 */

import type { GameState } from '@evozen/shared-types';
import { getRaceMainType } from './races';

// ============================================================
// 总督背景（10 种）— 对标 gmen L14-105
// ============================================================

export type GovernorBackgroundId =
  | 'soldier' | 'criminal' | 'entrepreneur' | 'educator' | 'spiritual'
  | 'bluecollar' | 'noble' | 'media' | 'sports' | 'bureaucrat';

export interface GovernorBackgroundDef {
  id: GovernorBackgroundId;
  name: string;
  desc: string;
  titles: string[];
  /** 背景自带的 trait 集合，rank=1 默认 */
  traits: Record<string, number>;
}

export const GOVERNOR_BACKGROUNDS: Record<GovernorBackgroundId, GovernorBackgroundDef> = {
  soldier:      { id: 'soldier',      name: '军人',     desc: '军旅生涯锻就坚毅，擅长战争和镇压。',     titles: ['上校', '将军', '元帅'],                                  traits: { tactician: 1, militant: 1, nopain: 1 } },
  criminal:     { id: 'criminal',     name: '罪犯',     desc: '不择手段获取利益，从地下世界爬上权位。', titles: ['黑道大佬', '幕后老板', '教父/教母'],                       traits: { noquestions: 1, racketeer: 1 } },
  entrepreneur: { id: 'entrepreneur', name: '企业家',   desc: '商业奇才，眼光独到。',                   titles: ['创办人', '执行长', '总裁先生/夫人'],                       traits: { dealmaker: 1, risktaker: 1 } },
  educator:     { id: 'educator',     name: '教育家',   desc: '学者型领导者，重视知识传承。',           titles: ['校长', '院士', '哲学家'],                                  traits: { teacher: 1, theorist: 1 } },
  spiritual:    { id: 'spiritual',    name: '神职',     desc: '虔诚的精神领袖。',                       titles: ['牧师', '主教', '大祭司'],                                  traits: { inspirational: 1, pious: 1 } },
  bluecollar:   { id: 'bluecollar',   name: '蓝领',     desc: '实干派，从基层做起。',                   titles: ['工头', '匠人', '工厂主人/夫人'],                           traits: { pragmatist: 1, dirty_jobs: 1 } },
  noble:        { id: 'noble',        name: '贵族',     desc: '世袭血统，骨子里高人一等。',             titles: ['少爷/小姐', '伯爵/伯爵夫人', '公爵/公爵夫人', '王/王后'], traits: { extravagant: 1, aristocrat: 1 } },
  media:        { id: 'media',        name: '媒体人',   desc: '舆论操控大师。',                         titles: ['记者', '主编先生/女士', '总裁'],                           traits: { gaslighter: 1, muckraker: 1 } },
  sports:       { id: 'sports',       name: '运动员',   desc: '体育明星出身，受民众喜爱。',             titles: ['运动员', '冠军', '体育领袖'],                              traits: { athleticism: 1, runner: 1 } },
  bureaucrat:   { id: 'bureaucrat',   name: '官僚',     desc: '公务体系内的高效组织者。',               titles: ['书记官', '部长先生/女士', '总管'],                         traits: { organizer: 1 } },
};

// ============================================================
// 总督特质（22 种）— 对标 gov_traits L107-307
// vars 数组：[基础值, 强化值] 在 genes.governor >= 3 时启用强化
// ============================================================

export interface GovernorTraitDef {
  id: string;
  name: string;
  desc: string;
  /** 默认值 [base, ...] */
  base: number[];
  /** 升级值（genes.governor >= 3） */
  boosted: number[];
}

export const GOVERNOR_TRAITS: Record<string, GovernorTraitDef> = {
  tactician:     { id: 'tactician',     name: '战术家',     desc: '部队战斗力 +25%（升级 +30%）。',                      base: [25],       boosted: [30] },
  militant:      { id: 'militant',      name: '尚武',       desc: '征兵速度 +25%（升级 +30%），士气 +10。',              base: [25, 10],   boosted: [30, 10] },
  noquestions:   { id: 'noquestions',   name: '不问出处',   desc: '每秒贪污 0.5% 金钱。',                                base: [0.005],    boosted: [0.005] },
  racketeer:     { id: 'racketeer',     name: '黑社会',     desc: '银行容量 +20%（升级 +18%），贸易额度 +35%（升级 +45%）。', base: [20, 35], boosted: [18, 45] },
  dealmaker:     { id: 'dealmaker',     name: '谈判专家',   desc: '银行存款 +125%（升级 +150%）。',                      base: [125],      boosted: [150] },
  risktaker:     { id: 'risktaker',     name: '冒险家',     desc: 'ARPA 进度成本递增 -12%（升级 -14%）。',               base: [12],       boosted: [14] },
  teacher:       { id: 'teacher',       name: '老师',       desc: '教授知识 +6/秒，图书馆 +30%。',                       base: [6, 30],    boosted: [6, 30] },
  theorist:      { id: 'theorist',      name: '理论家',     desc: '科学家影响 +50%（升级 +100%），知识 +4 万（升级 +200 万）。', base: [50, 4],  boosted: [100, 2] },
  inspirational: { id: 'inspirational', name: '激励人心',   desc: '士气 +20%（升级 +30%）。',                            base: [20],       boosted: [30] },
  pious:         { id: 'pious',         name: '虔诚',       desc: '神殿额外 +10%（升级 +8%），教堂额外 +5%。',           base: [10, 5],    boosted: [8, 8] },
  pragmatist:    { id: 'pragmatist',    name: '实用主义',   desc: '工厂效率 +50%（升级 +100%），工厂上限 +2。',          base: [50, 2],    boosted: [100, 2] },
  dirty_jobs:    { id: 'dirty_jobs',    name: '苦活担当',   desc: '工人健康 +1.5%，矿场上限 +1（升级 +2），地下钻探 +14%（升级 +18%）。', base: [0.015, 1, 14], boosted: [0.015, 2, 18] },
  extravagant:   { id: 'extravagant',   name: '奢侈',       desc: '豪宅效益 +10%（升级 +8%），豪宅容量 +1（升级 +1.25），市民容量 +1（升级 +2）。', base: [10, 1.25, 1], boosted: [8, 1, 2] },
  aristocrat:    { id: 'aristocrat',    name: '贵族',       desc: '税收容差 +50%（升级 +60%），市民效率 +20%，市民容量 +10（升级 +5）。', base: [50, 20, 10], boosted: [60, 20, 5] },
  gaslighter:    { id: 'gaslighter',    name: '操控者',     desc: '监狱 +1（升级 +2），消息频率 -1（升级 -2），警卫 +0.5x，士气 +30。', base: [1, 1, 0.5, 30], boosted: [2, 2, 0.5, 35] },
  muckraker:     { id: 'muckraker',     name: '揭发者',     desc: '丑闻每 8 天发生（升级 6 天），影响 12 天，损失 -3（升级 -2）。', base: [8, 12, 3], boosted: [6, 12, 2] },
  athleticism:   { id: 'athleticism',   name: '运动员',     desc: '士兵 +1.5x，体力 +2，监狱 +4（升级 +3）。',           base: [1.5, 2, 4], boosted: [1.5, 2, 3] },
  nopain:        { id: 'nopain',        name: '无痛',       desc: '负面 trait 强度 -40%（升级 -50%）。',                 base: [40],       boosted: [50] },
  runner:        { id: 'runner',        name: '奔跑者',     desc: '速度加成 +10%（升级 +20%），耐力 +8%（升级 +12%）。', base: [10, 8],    boosted: [20, 12] },
  organizer:     { id: 'organizer',     name: '组织者',     desc: '解锁 +1 任务槽（升级 +2）。',                         base: [1],        boosted: [2] },
};

// ============================================================
// 自动化任务（13 种）— 对标 gov_tasks L863-1900+
// ============================================================

export type GovernorTaskId =
  | 'none'
  | 'tax'           // 动态税率
  | 'storage'       // 自动建造板条箱/集装箱
  | 'bal_storage'   // 平衡存储分配
  | 'assemble'      // 自动装配市民
  | 'clone'         // 自动克隆
  | 'merc'          // 自动雇佣兵
  | 'spy'           // 自动招募间谍
  | 'spyop'         // 自动间谍行动
  | 'slave'         // 奴隶补充
  | 'sacrifice'     // 自动献祭
  | 'horseshoe'     // 自动制马蹄铁
  | 'mech'          // 自动制造机甲
  | 'replicate';    // 自动复制

export interface GovernorTaskDef {
  id: GovernorTaskId;
  name: string;
  desc: string;
  /** 触发任务可用的条件（基于科技/解锁状态） */
  isAvailable: (state: GameState) => boolean;
}

export const GOVERNOR_TASKS: Record<GovernorTaskId, GovernorTaskDef> = {
  none: { id: 'none', name: '空闲', desc: '不执行任何任务。', isAvailable: () => true },
  tax: {
    id: 'tax', name: '动态税率', desc: '根据士气自动调整税率。',
    isAvailable: (state) => (state.civic.taxes?.tax_rate ?? 0) >= 0,
  },
  storage: {
    id: 'storage', name: '建造存储', desc: '自动建造板条箱和集装箱。',
    isAvailable: (state) => (state.tech['container'] ?? 0) > 0,
  },
  bal_storage: {
    id: 'bal_storage', name: '平衡存储', desc: '自动调整各资源板条箱/集装箱分配。',
    isAvailable: (state) => (state.tech['container'] ?? 0) > 0,
  },
  assemble: {
    id: 'assemble', name: '装配市民', desc: '自动从蛋仓装配新市民（合成种族）。',
    isAvailable: (state) => !!state.race['artifical'] && (state.tech['xeno'] ?? 0) >= 5,
  },
  clone: {
    id: 'clone', name: '克隆市民', desc: '自动从克隆罐生成市民。',
    isAvailable: (state) => (state.tech['cloning'] ?? 0) >= 1,
  },
  merc: {
    id: 'merc', name: '雇佣兵', desc: '维持驻军规模，资金充足时自动招募。',
    isAvailable: (state) => state.civic.garrison?.mercs === true,
  },
  spy: {
    id: 'spy', name: '招募间谍', desc: '自动招募间谍。',
    isAvailable: (state) => (state.tech['spy'] ?? 0) >= 1,
  },
  spyop: {
    id: 'spyop', name: '间谍行动', desc: '自动指派间谍任务。',
    isAvailable: (state) => (state.tech['spy'] ?? 0) >= 2,
  },
  slave: {
    id: 'slave', name: '补充奴隶', desc: '自动俘获奴隶填满奴隶围栏。',
    isAvailable: (state) => !!state.race['slaver'],
  },
  sacrifice: {
    id: 'sacrifice', name: '献祭', desc: '自动献祭以维持生育率。',
    isAvailable: (state) => (state.tech['sacrifice'] ?? 0) >= 1,
  },
  horseshoe: {
    id: 'horseshoe', name: '马蹄铁', desc: '自动制造马蹄铁（centaur）。',
    isAvailable: (state) => !!state.race['hooved'],
  },
  mech: {
    id: 'mech', name: '机甲', desc: '自动建造和派遣地狱机甲。',
    isAvailable: (state) => (state.tech['hell_pit'] ?? 0) >= 7,
  },
  replicate: {
    id: 'replicate', name: '复制', desc: '自动复制纳米（nano）人口。',
    isAvailable: (state) => !!state.race['deconstructor'],
  },
};

// ============================================================
// 候选名字池（每 genus 10 个）— 对标 names L309-330
// ============================================================

export const GOVERNOR_NAMES: Record<string, string[]> = {
  humanoid:  ['桑德斯', '史密斯', '盖登', '勃艮第', '克里斯托', '克朗奇', '伯格', '莫罗斯', '鲍尔', '马克西穆斯'],
  carnivore: ['本能', '潜伏', '掌爪', '蓬毛', '咆哮', '利爪', '尖牙', '潜行', '猛扑', '嗅探'],
  herbivore: ['感知', '吃草', '掌爪', '蓬毛', '蕨菜', '利爪', '尖牙', '青草', '踏踏', '嗅探'],
  omnivore:  ['毛皮', '咀嚼', '掌爪', '蓬毛', '咆哮', '利爪', '尖牙', '斯卡瓦斯', '猛扑', '嗅探'],
  small:     ['巴金斯', '班克斯', '矮个', '帕特', '脚踝', '小虾', '芬克尔', '小脚', '幼崽', '小不点'],
  giant:     ['苗条', '泰坦', '巨像', '豆茎', '高塔', '云顶', '大脚', '高山', '碎击', '兆吨'],
  reptilian: ['鳞甲', '凯美拉', '冷血', '晒太阳', '叉舌', '鳄鱼', '蛇行', '阳光', '冷脚', '蹼趾'],
  avian:     ['麻雀', '翱翔', '闪羽', '渡鸦', '尖叫', '艾迪', '微风', '振翅', '茶壶', '群鸟'],
  insectoid: ['复眼', '蜈蚣', '蜂巢', '嗡鸣', '甲壳', '虫群', '吞噬', '螳螂', '颤抖', '挖洞'],
  plant:     ['格罗弗', '花朵', '叶片', '汁液', '茎秆', '种子', '萌芽', '青翠', '根系', '果实'],
  fungi:     ['碎屑', '迷幻', '伞盖', '腐脸', '斑块', '孢子', '感染', '丝线', '共生', '阴影'],
  aquatic:   ['海狼', '芬斯利', '英科', '吸盘', '麦克船面', '海浪', '激流', '贝壳', '珊瑚', '珍珠'],
  fey:       ['低语', '恶作剧', '调皮', '蝴蝶', '自然', '尘土', '故事', '书匠', '传说', '精神'],
  heat:      ['灰烬', '马格努斯', '浮石', '火山', '汗水', '烈焰', '熔岩', '余烬', '烟雾', '引子'],
  polar:     ['冰冷', '雪球', '雪花', '寒颤', '寒霜', '冷却者', '冰块', '北极', '苔原', '雪崩'],
  sand:      ['沙丘', '绿洲', '沙拉克', '香料', '迅疾', '沙粒', '尖刺', '沙暴', '玻璃', '城堡'],
  demonic:   ['耶坤', '凯萨贝尔', '加德雷尔', '佩内缪', '阿巴顿', '阿撒泽尔', '利维坦', '萨迈亚扎', '卡薛达', '蒂丰'],
  angelic:   ['光带来者', '辉煌', '火花', '小天使', '光环', '星辰', '骄傲', '光辉', '蓬毛', '法比奥'],
  synthetic: ['HK47', 'D2R2', '主教', '瓦力', '5号', '阳光', '数据', '贝塔', '点点', '素子'],
  eldritch:  ['触手', '无脸', '恐怖', '黑暗', '虚空', '梦者', '夺心怪', '低语', '偏执', '虚无'],
};

// ============================================================
// 状态接口
// ============================================================

export interface GovernorCandidate {
  /** 背景 */
  bg: GovernorBackgroundId;
  /** 头衔 */
  t: string;
  /** 名字 */
  n: string;
}

export interface GovernorTasks {
  t0: GovernorTaskId;
  t1: GovernorTaskId;
  t2: GovernorTaskId;
  t3?: GovernorTaskId;
  t4?: GovernorTaskId;
}

export interface GovernorState {
  g?: GovernorCandidate;
  candidates?: GovernorCandidate[];
  tasks: GovernorTasks;
  config: Record<string, unknown>;
}

// ============================================================
// 工具函数
// ============================================================

/** 生成 N 位候选总督 — 对标 genGovernor L332-361 */
export function generateGovernorCandidates(state: GameState, count: number = 10): GovernorCandidate[] {
  const genus = getRaceMainType(state) ?? 'humanoid';
  const namePool = [...(GOVERNOR_NAMES[genus] ?? GOVERNOR_NAMES['humanoid'])];
  const bgPool = Object.keys(GOVERNOR_BACKGROUNDS) as GovernorBackgroundId[];

  const candidates: GovernorCandidate[] = [];
  for (let i = 0; i < count; i++) {
    if (namePool.length === 0) namePool.push(...(GOVERNOR_NAMES[genus] ?? GOVERNOR_NAMES['humanoid']));
    if (bgPool.length === 0) bgPool.push(...(Object.keys(GOVERNOR_BACKGROUNDS) as GovernorBackgroundId[]));

    const bgIdx = Math.floor(Math.random() * bgPool.length);
    const nameIdx = Math.floor(Math.random() * namePool.length);

    const bg = bgPool.splice(bgIdx, 1)[0];
    const name = namePool.splice(nameIdx, 1)[0];

    const titleArr = GOVERNOR_BACKGROUNDS[bg].titles;
    const title = titleArr[Math.floor(Math.random() * titleArr.length)];

    candidates.push({ bg, t: title, n: name });
  }
  return candidates;
}

/** 任命某候选为总督，初始化任务和配置 */
export function appointGovernor(state: GameState, candidate: GovernorCandidate): void {
  state.race['governor'] = {
    g: candidate,
    tasks: { t0: 'none', t1: 'none', t2: 'none' } as GovernorTasks,
    config: {
      storage: { crt: 1000, cnt: 1000 },
      bal_storage: { adv: false },
      merc: { buffer: 1, reserve: 100 },
      spy: { reserve: 100 },
      tax: { min: 20 },
    },
  } as GovernorState as unknown as GameState['race']['governor'];
}

/** 解雇当前总督 */
export function fireGovernor(state: GameState): void {
  if (state.race['governor']) {
    delete (state.race as Record<string, unknown>)['governor'];
  }
}

/**
 * 判断某 trait 是否激活（在当前总督的背景 traits 中）
 * 对标 govActive(trait, varIdx) L846-852
 * @returns 若 trait 激活，返回该 trait 的 vars[varIdx] 数值；否则返回 0
 */
export function govActive(state: GameState, traitId: string, varIdx: number = 0): number {
  const governor = state.race['governor'] as GovernorState | undefined;
  if (!governor?.g) return 0;
  const bg = GOVERNOR_BACKGROUNDS[governor.g.bg];
  if (!(traitId in bg.traits)) return 0;

  const traitDef = GOVERNOR_TRAITS[traitId];
  if (!traitDef) return 0;

  // 高级（boosted）需要 genes.governor >= 3
  const boosted = ((state.genes as Record<string, number>)?.['governor'] ?? 0) >= 3;
  const vars = boosted ? traitDef.boosted : traitDef.base;
  return vars[varIdx] ?? 0;
}

/** 当前总督可用的任务槽数（含 organizer trait 加成） */
export function getTaskSlotCount(state: GameState): number {
  let slots = 3;
  const genes = ((state.genes as Record<string, number>)?.['governor'] ?? 0);
  if (genes >= 2) slots++;
  slots += govActive(state, 'organizer', 0);
  return slots;
}

/** 设置某任务槽的任务 */
export function setGovernorTask(state: GameState, slot: 0 | 1 | 2 | 3 | 4, task: GovernorTaskId): void {
  const governor = state.race['governor'] as GovernorState | undefined;
  if (!governor) return;
  governor.tasks[`t${slot}` as keyof GovernorTasks] = task;
}

/**
 * 执行总督任务（每 tick 调用一次）
 * 对标 govern() L363-377
 */
export function runGovernorTasks(state: GameState): void {
  const governor = state.race['governor'] as GovernorState | undefined;
  if (!governor?.g || !governor.tasks) return;

  const slots = getTaskSlotCount(state);
  for (let i = 0; i < slots; i++) {
    const taskId = governor.tasks[`t${i}` as keyof GovernorTasks];
    if (!taskId || taskId === 'none') continue;
    const task = GOVERNOR_TASKS[taskId];
    if (task && task.isAvailable(state)) {
      executeGovernorTask(state, taskId);
    }
  }
}

/** 执行单个任务（核心逻辑分发） */
function executeGovernorTask(state: GameState, taskId: GovernorTaskId): void {
  switch (taskId) {
    case 'tax':
      runTaxTask(state);
      break;
    case 'storage':
      runStorageTask(state);
      break;
    case 'merc':
      runMercTask(state);
      break;
    case 'spy':
      runSpyTask(state);
      break;
    // 其他任务待实装（依赖目标系统）
  }
}

/** 动态税率任务 — 简化版 */
function runTaxTask(state: GameState): void {
  const taxes = state.civic.taxes;
  if (!taxes) return;
  const morale = (state.city.morale?.current ?? 100);
  const oligarchy = state.civic.govern?.type === 'oligarchy';
  const minTax = oligarchy ? 45 : 25;
  const config = (state.race['governor'] as GovernorState | undefined)?.config?.['tax'] as { min: number } | undefined;
  const configMin = config?.min ?? 20;

  if (morale < 100 && taxes.tax_rate > minTax) {
    taxes.tax_rate = Math.max(minTax, taxes.tax_rate - 1);
  } else if (morale > 100 && taxes.tax_rate < 50) {
    taxes.tax_rate = Math.min(50, taxes.tax_rate + 1);
  } else if (morale < state.city.morale!.cap && taxes.tax_rate > configMin) {
    taxes.tax_rate = Math.max(configMin, taxes.tax_rate - 1);
  }
}

/** 自动建造存储 — 简化版（只检查资源是否足够）*/
function runStorageTask(state: GameState): void {
  const crates = state.resource['Crates'];
  if (!crates || crates.amount >= crates.max) return;

  const isKindling = !!state.race['kindling_kindred'];
  const mat = isKindling ? 'Stone' : 'Plywood';
  const cost = isKindling ? 200 : 10;
  const config = (state.race['governor'] as GovernorState | undefined)?.config?.['storage'] as { crt: number } | undefined;
  const reserve = config?.crt ?? 1000;

  const matRes = state.resource[mat];
  if (matRes && matRes.amount > reserve + cost) {
    crates.amount = Math.min(crates.max, crates.amount + 1);
    matRes.amount -= cost;
  }
}

/** 自动招募雇佣兵 — 简化版 */
function runMercTask(state: GameState): void {
  const garrison = state.civic.garrison;
  if (!garrison || !garrison.mercs) return;
  if (garrison.workers >= garrison.max) return;

  const config = (state.race['governor'] as GovernorState | undefined)?.config?.['merc'] as { buffer: number; reserve: number } | undefined;
  const reserve = config?.reserve ?? 100;
  const money = state.resource['Money'];
  if (!money) return;

  // 简化：当金钱储备超过保留比例时招募一名雇佣兵（成本 = 50）
  const reserveAmount = (money.max * reserve) / 100;
  if (money.amount > reserveAmount + 50) {
    garrison.workers++;
    money.amount -= 50;
    garrison.m_use = (garrison.m_use ?? 0) + 1;
  }
}

/** 自动招募间谍 — 简化版 */
function runSpyTask(state: GameState): void {
  const foreign = state.civic.foreign;
  if (!foreign) return;
  for (let i = 0; i < 3; i++) {
    const gov = foreign[`gov${i}` as keyof typeof foreign] as { spy: number; occ: boolean; anx: boolean; buy: boolean };
    if (!gov || gov.occ || gov.anx || gov.buy) continue;
    if (gov.spy < 5) {
      const config = (state.race['governor'] as GovernorState | undefined)?.config?.['spy'] as { reserve: number } | undefined;
      const reserve = config?.reserve ?? 100;
      const money = state.resource['Money'];
      if (money && money.amount > (money.max * reserve) / 100 + 1000) {
        gov.spy++;
        money.amount -= 1000;
      }
    }
  }
}
