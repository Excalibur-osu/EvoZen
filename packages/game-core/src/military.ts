/**
 * 军事系统核心逻辑
 * 对标 legacy/src/civics.js 军事相关函数
 *
 * 所有函数均为纯函数（除直接修改 state 的 tick 函数），
 * 便于测试和 game-core 引擎集成。
 */

import type { GameState, GameMessage } from '@evozen/shared-types';
import { applyDerivedStateInPlace } from './derived-state';
import { getTrainingSpeedDivisor, getBruteTrainingBonus, getMercCostMultiplier } from './traits';
import { hasPlanetTrait, rageVars } from './planet-traits';

// ============================================================
// 武器科技倍率
// 对标 legacy civics.js L2114-2128: weaponTechModifer
// ============================================================

export function weaponTechModifier(state: GameState): number {
  const milLevel = state.tech['military'] ?? 0;
  if (milLevel === 0) return 1;

  let weapon_tech = milLevel >= 5 ? milLevel - 1 : milLevel;

  if (milLevel > 1) {
    weapon_tech -= milLevel >= 11 ? 2 : 1;
    // 种族特性 sniper 等暂不实现
    weapon_tech += milLevel >= 11 ? 2 : 1;
  }

  return weapon_tech;
}

// ============================================================
// 军队评级（简化版）
// 对标 legacy civics.js L2140-2165
// ============================================================

export function armyRating(
  soldiers: number,
  state: GameState,
  wound?: number
): number {
  const garrison = state.civic.garrison;
  if (!garrison) return 0;

  let wounded = 0;
  if (typeof wound === 'number') {
    wounded = wound;
  } else if (soldiers > garrison.workers - garrison.wounded) {
    wounded = soldiers - (garrison.workers - garrison.wounded);
  }

  const weapon_tech = weaponTechModifier(state);
  const adjusted_val = soldiers - wounded / 2;
  let army = state.tech['military'] ? adjusted_val * weapon_tech : adjusted_val;

  // 政体加成：独裁 +35% 军力
  if (state.civic.govern.type === 'autocracy') {
    army *= 1.35;
  }

  // rage 行星特性：战斗力 ×1.05
  // 对标 legacy civics.js L2288: armyRating *= rage.vars()[0]
  if (hasPlanetTrait(state, 'rage')) {
    army *= rageVars()[0];
  }

  return Math.max(army, 0);
}

// ============================================================
// 护甲减伤
// 对标 legacy civics.js armorCalc（简化版）
// ============================================================

export function armorCalc(deaths: number, state: GameState): number {
  const armorLevel = state.tech['armor'] ?? 0;
  if (armorLevel === 0) return 0;

  // 每级护甲减少 ~1 名死亡
  let armored = armorLevel;
  if (armored > deaths) {
    armored = deaths;
  }
  return armored;
}

// ============================================================
// 士兵训练 tick
// 对标 legacy main.js L8008-8057
// ============================================================

export function tickTraining(state: GameState, timeMul: number): void {
  const garrison = state.civic.garrison;
  const unemployed = state.civic.unemployed as { workers?: number } | undefined;
  if (!garrison || garrison.workers >= garrison.max) {
    if (garrison) garrison.rate = 0;
    return;
  }
  if ((unemployed?.workers ?? 0) <= 0) {
    garrison.rate = 0;
    return;
  }

  let rate = 2.5;

  // diverse（人类）：训练速度下降。legacy main.js L8013: rate /= 1 + 25/100
  // 在 boot_camp 乘法之前应用（对标 legacy 顺序）
  rate /= getTrainingSpeedDivisor(state);

  // boot_camp 加成
  if (state.city['boot_camp'] && typeof state.city['boot_camp'] === 'object') {
    const bootCamp = state.city['boot_camp'] as { count: number };
    if (bootCamp.count > 0) {
      const train = (state.tech['boot_camp'] ?? 0) >= 2 ? 0.08 : 0.05;
      rate *= 1 + bootCamp.count * train;
    }
  }

  garrison.rate = rate * timeMul;

  // brute（兽人）：加法叠加训练加成。legacy main.js L8042: rate += vars()[1]/40 * time_mul
  // 在 rate*timeMul 之后加（对标 legacy 顺序）
  garrison.rate += getBruteTrainingBonus(state, timeMul);

  garrison.progress += garrison.rate;

  while (garrison.progress >= 100) {
    if ((unemployed?.workers ?? 0) <= 0) {
      break;
    }
    garrison.progress -= 100;
    garrison.workers++;
    unemployed!.workers = (unemployed!.workers ?? 0) - 1;
    if (garrison.workers >= garrison.max) {
      garrison.progress = 0;
      break;
    }
  }
}

// ============================================================
// 伤兵治愈 tick
// 对标 legacy 医院治愈逻辑
// ============================================================

export function tickHealing(state: GameState, timeMul: number): void {
  const garrison = state.civic.garrison;
  if (!garrison || garrison.wounded <= 0) return;

  // 医院数量
  let hospitalCount = 0;
  if (state.city['hospital'] && typeof state.city['hospital'] === 'object') {
    hospitalCount = (state.city['hospital'] as { count: number }).count;
  }

  if (hospitalCount > 0) {
    const healingRate = Math.max(1, state.tech['medic'] ?? 0) * 5;
    const healPerTick = hospitalCount * (healingRate / 100) * timeMul;
    garrison.heal_progress = (garrison.heal_progress ?? 0) + healPerTick;

    const healed = Math.min(
      Math.floor(garrison.heal_progress ?? 0),
      garrison.wounded
    );
    if (healed > 0) {
      garrison.wounded -= healed;
      garrison.heal_progress = Math.max(0, (garrison.heal_progress ?? 0) - healed);
    }
  }

  // 自然恢复（很慢）
  if (garrison.wounded > 0 && Math.random() < 0.01 * timeMul) {
    garrison.wounded--;
  }
}

// ============================================================
// 佣兵费用
// 对标 legacy civics.js L1128-1150
// ============================================================

export function mercCost(state: GameState): number {
  const garrison = state.civic.garrison;
  let cost = Math.round(Math.pow(1.24, garrison.workers) * 75) - 50;
  if (cost > 25000) cost = 25000;

  if (garrison.m_use > 0) {
    cost *= Math.pow(1.1, garrison.m_use);
  }

  // brute（兽人）：佣兵费用 ×0.5。legacy civics.js L1138: cost *= 1 - vars()[0]/100, vars()[0]=50
  cost *= getMercCostMultiplier(state);

  return Math.round(cost);
}

// ============================================================
// 雇佣佣兵
// 对标 legacy civics.js L1152-1172
// ============================================================

export function hireMerc(state: GameState): { success: boolean; cost: number } {
  const garrison = state.civic.garrison;
  if (!state.tech['mercs']) {
    return { success: false, cost: 0 };
  }

  const cost = mercCost(state);
  if (garrison.workers >= garrison.max) {
    return { success: false, cost };
  }
  if (state.resource.Money.amount < cost) {
    return { success: false, cost };
  }

  state.resource.Money.amount -= cost;
  garrison.workers++;
  garrison.m_use++;
  return { success: true, cost };
}

// ============================================================
// 战役结果
// ============================================================

export interface WarResult {
  victory: boolean;
  deaths: number;
  wounded: number;
  loot: Record<string, number>;
  messages: GameMessage[];
}

// ============================================================
// 战术名称
// ============================================================

export const TACTIC_NAMES = [
  '伏击', // 0
  '突袭', // 1
  '劫掠', // 2
  '强攻', // 3
  '围攻', // 4
] as const;

// ============================================================
// 战役执行
// 对标 legacy civics.js L1548-1900（简化版）
// ============================================================

export function warCampaign(state: GameState, govIndex: number): WarResult {
  const garrison = state.civic.garrison;
  const gov = state.civic.foreign[`gov${govIndex}` as keyof typeof state.civic.foreign] as {
    unrest: number; hstl: number; mil: number; eco: number;
    occ: boolean; anx: boolean; buy: boolean;
  } | undefined;

  const messages: GameMessage[] = [];
  const emptyResult: WarResult = { victory: false, deaths: 0, wounded: 0, loot: {}, messages };

  if (!gov || !garrison) return emptyResult;

  // 解除占领
  if (gov.occ) {
    gov.occ = false;
    garrison.max += 2; // 简化：返还驻军
    garrison.workers += 2;
    applyDerivedStateInPlace(state);
    messages.push({ text: '驻军已撤回。', type: 'info', category: 'combat' });
    return { ...emptyResult, messages };
  }
  if (gov.anx || gov.buy) {
    gov.anx = false;
    gov.buy = false;
    messages.push({ text: '已解除控制。', type: 'info', category: 'combat' });
    return { ...emptyResult, messages };
  }

  // 没有出征士兵
  if (garrison.raid <= 0) {
    messages.push({ text: '没有派遣士兵出征！', type: 'warning', category: 'combat' });
    return { ...emptyResult, messages };
  }

  // 限制 raid 不超过可用士兵
  const available = garrison.workers - garrison.crew;
  if (garrison.raid > available) {
    garrison.raid = available;
  }

  state.stats.attacks = (state.stats.attacks ?? 0) + 1;

  // 计算军力
  const luck = (5 + Math.random() * 11) / 10; // 0.5 ~ 1.6
  const army = armyRating(garrison.raid, state) * luck;

  // 计算敌军
  let enemyBase = 0;
  switch (garrison.tactic) {
    case 0: enemyBase = Math.random() * 10; break;
    case 1: enemyBase = 5 + Math.random() * 45; break;
    case 2: enemyBase = 25 + Math.random() * 75; break;
    case 3: enemyBase = 50 + Math.random() * 150; break;
    case 4: enemyBase = 100 + Math.random() * 400; break;
  }
  const enemy = Math.floor(enemyBase * (gov.mil || 75) / 100);

  // 仇恨增加
  const hstlInc = [
    Math.floor(Math.random() * 2),
    Math.floor(Math.random() * 3),
    1 + Math.floor(Math.random() * 4),
    4 + Math.floor(Math.random() * 8),
    10 + Math.floor(Math.random() * 15),
  ];
  gov.hstl = Math.min(100, gov.hstl + hstlInc[garrison.tactic]);

  garrison.fatigue++;

  if (army > enemy) {
    // === 胜利 ===
    let deathCap = Math.floor(garrison.raid / (5 - garrison.tactic));
    if (deathCap < 1) deathCap = 1;
    if (deathCap > garrison.raid) deathCap = garrison.raid;
    // rage 行星特性：额外死亡上限 +1
    // 对标 legacy civics.js L1635: deathCap += rage.vars()[2]
    if (hasPlanetTrait(state, 'rage')) {
      deathCap += rageVars()[2];
    }

    let deaths = Math.floor(Math.random() * deathCap);
    const armor = armorCalc(deaths, state);
    deaths = Math.max(0, deaths - armor);
    if (deaths > garrison.raid) deaths = garrison.raid;

    // 执行死亡
    applyGarrisonDeaths(state, deaths);

    // 新增伤兵
    const newWounded = Math.floor(Math.random() * (garrison.raid - deaths));
    garrison.wounded = Math.min(
      garrison.wounded + newWounded,
      garrison.workers
    );

    // 战利品
    const loot: Record<string, number> = {};
    const lootMul = [1, 2.5, 5, 10, 25][garrison.tactic];
    const moneyLoot = Math.floor((100 + Math.random() * 275) * lootMul * (gov.eco || 75) / 100);
    loot.Money = moneyLoot;

    // 基础资源随机掠夺
    const basicRes = ['Food', 'Lumber', 'Stone'];
    const commonRes = ['Copper', 'Iron', 'Aluminium', 'Coal'];
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (garrison.tactic >= 0) {
      const r = pick(basicRes);
      loot[r] = (loot[r] ?? 0) + Math.floor(40 + Math.random() * 135);
    }
    if (garrison.tactic >= 1) {
      const r = pick(commonRes);
      loot[r] = (loot[r] ?? 0) + Math.floor(20 + Math.random() * 80);
    }
    if (garrison.tactic >= 2) {
      const r = pick([...basicRes, ...commonRes]);
      loot[r] = (loot[r] ?? 0) + Math.floor(30 + Math.random() * 100);
    }

    // 分配战利品到资源
    for (const [res, amount] of Object.entries(loot)) {
      if (state.resource[res]) {
        state.resource[res].amount = Math.min(
          state.resource[res].amount + amount,
          state.resource[res].max >= 0 ? state.resource[res].max : Infinity
        );
      }
    }

    const tacticName = TACTIC_NAMES[garrison.tactic];
    const lootStr = Object.entries(loot).map(([k, v]) => `${k}: +${v}`).join(', ');
    messages.push({
      text: `${tacticName}战役胜利！阵亡 ${deaths} 人，负伤 ${newWounded} 人。掠夺: ${lootStr}`,
      type: 'success',
      category: 'combat',
    });

    // 围攻胜利 → 占领
    if (garrison.tactic === 4 && govIndex < 3) {
      const occCost = 20;
      if (garrison.workers >= occCost) {
        gov.occ = true;
        garrison.max -= occCost;
        garrison.workers -= occCost;
        messages.push({
          text: '敌方政府已被占领！',
          type: 'special',
          category: 'combat',
        });
      }
    }

    return { victory: true, deaths, wounded: newWounded, loot, messages };
  } else {
    // === 失败 ===
    let deaths = Math.floor(garrison.raid * 0.2 + Math.random() * garrison.raid * 0.3);
    if (deaths > garrison.raid) deaths = garrison.raid;
    const armor = armorCalc(Math.floor(deaths * 0.3), state);
    deaths = Math.max(0, deaths - armor);

    applyGarrisonDeaths(state, deaths);

    const newWounded = Math.floor(Math.random() * (garrison.raid - deaths));
    garrison.wounded = Math.min(
      garrison.wounded + newWounded,
      garrison.workers
    );

    const tacticName = TACTIC_NAMES[garrison.tactic];
    messages.push({
      text: `${tacticName}战役失败！阵亡 ${deaths} 人，负伤 ${newWounded} 人。`,
      type: 'danger',
      category: 'combat',
    });

    return { victory: false, deaths, wounded: newWounded, loot: {}, messages };
  }
}

function applyGarrisonDeaths(state: GameState, deaths: number): void {
  if (deaths <= 0) return;

  const garrison = state.civic.garrison;
  garrison.workers = Math.max(0, garrison.workers - deaths);
  garrison.protest += deaths;
  state.stats.died = (state.stats.died ?? 0) + deaths;

  const species = state.race.species;
  const population = state.resource[species];
  if (population) {
    population.amount = Math.max(0, population.amount - deaths);
  }
}

// ============================================================
// 驻军大小（可用于出征的实际兵力）
// ============================================================

export function garrisonSize(state: GameState): number {
  const garrison = state.civic.garrison;
  if (!garrison) return 0;
  return Math.max(0, garrison.workers - garrison.crew);
}
