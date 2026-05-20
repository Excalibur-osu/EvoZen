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

  // 种族 trait 战斗加成
  // apex_predator：狩猎/战斗显著提升
  if (state.race['apex_predator']) {
    const rank = (state.race['apex_predator'] as number) || 1;
    // vars[0]: combat bonus pct
    const mul = rank === 0.1 ? 10 : rank === 0.25 ? 15 : rank === 0.5 ? 20 : rank === 1 ? 30 : rank === 2 ? 40 : rank === 3 ? 45 : 50;
    army *= 1 + mul / 100;
  }
  // fiery (balorg)：主要战争加成
  if (state.race['fiery']) {
    const rank = (state.race['fiery'] as number) || 1;
    const mul = rank === 0.1 ? 20 : rank === 0.25 ? 30 : rank === 0.5 ? 40 : rank === 1 ? 65 : rank === 2 ? 70 : rank === 3 ? 72 : 74;
    army *= 1 + mul / 100;
  }
  // swift (ghast)：战斗加成
  if (state.race['swift']) {
    const rank = (state.race['swift'] as number) || 1;
    const mul = rank === 0.1 ? 20 : rank === 0.25 ? 35 : rank === 0.5 ? 55 : rank === 1 ? 75 : rank === 2 ? 85 : rank === 3 ? 90 : 92;
    army *= 1 + mul / 100;
  }
  // sniper (centaur)：武器升级 +X%
  if (state.race['sniper'] && state.tech['military']) {
    const rank = (state.race['sniper'] as number) || 1;
    const mul = rank === 0.1 ? 3 : rank === 0.25 ? 4 : rank === 0.5 ? 6 : rank === 1 ? 8 : rank === 2 ? 9 : rank === 3 ? 10 : 11;
    const techMil = (state.tech['military'] as number) - 1;
    army *= 1 + (techMil * mul) / 100;
  }
  // pathetic (imp): -X% army
  if (state.race['pathetic']) {
    const rank = (state.race['pathetic'] as number) || 1;
    const mul = rank === 0.1 ? 40 : rank === 0.25 ? 35 : rank === 0.5 ? 30 : rank === 1 ? 25 : rank === 2 ? 20 : rank === 3 ? 15 : 12;
    army *= 1 - mul / 100;
  }
  // claws (scorpid): army roll upper bound +X%
  if (state.race['claws']) {
    const rank = (state.race['claws'] as number) || 1;
    const mul = rank === 0.1 ? 5 : rank === 0.25 ? 8 : rank === 0.5 ? 12 : rank === 1 ? 25 : rank === 2 ? 32 : rank === 3 ? 35 : 38;
    army *= 1 + mul / 100;
  }
  // grenadier (bombardier)：士兵单兵更强 但 fewer
  if (state.race['grenadier']) {
    const rank = (state.race['grenadier'] as number) || 1;
    const mul = rank === 0.1 ? 100 : rank === 0.25 ? 110 : rank === 0.5 ? 125 : rank === 1 ? 150 : rank === 2 ? 175 : rank === 3 ? 200 : 225;
    army *= mul / 100;
  }

  // Magic ritual: army
  const casting = state.race['casting'] as Record<string, number> | undefined;
  if (casting?.['army']) {
    army *= 1 + casting['army'] * 0.005;
  }

  // weather: cautious 雨天 -X% 战斗力
  if (state.race['cautious']) {
    const w = state.city.calendar?.weather ?? 2;
    if (w === 0) {
      const rank = (state.race['cautious'] as number) || 1;
      const mul = rank === 0.1 ? 16 : rank === 0.25 ? 14 : rank === 0.5 ? 12 : rank === 1 ? 10 : rank === 2 ? 8 : rank === 3 ? 6 : 4;
      army *= 1 - mul / 100;
    }
  }

  return Math.max(army, 0);
}

// ============================================================
// 护甲减伤
// 对标 legacy civics.js armorCalc（简化版）
// ============================================================

export function armorCalc(deaths: number, state: GameState): number {
  const armorLevel = state.tech['armor'] ?? 0;
  let armored = armorLevel;

  // 种族 trait armored (tortoisan): 战斗减少阵亡
  if (state.race['armored']) {
    const rank = (state.race['armored'] as number) || 1;
    // vars[0]: chance pct
    const chance = rank === 0.1 ? 10 : rank === 0.25 ? 15 : rank === 0.5 ? 25 : rank === 1 ? 50 : rank === 2 ? 70 : rank === 3 ? 80 : 85;
    armored += Math.floor(deaths * chance / 100);
  }
  // scales (reptilian): 减少阵亡
  if (state.race['scales']) {
    const rank = (state.race['scales'] as number) || 1;
    const reduce = rank === 0.1 ? 1 : rank === 0.25 ? 1 : rank === 0.5 ? 1 : rank === 1 ? 2 : rank === 2 ? 2 : rank === 3 ? 2 : 3;
    armored += reduce;
  }
  // apex_predator: 无护甲（即护甲返回 0）
  if (state.race['apex_predator']) armored = 0;
  // frail (mantis): 增加阵亡（即护甲降低）
  if (state.race['frail']) armored = Math.max(0, armored - 1);

  if (armorLevel === 0 && armored === 0) return 0;
  if (armored > deaths) armored = deaths;
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
    // 对标 legacy civics.js L1633: deathCap += wounded
    const woundedInRaid = garrison.raid > garrison.workers - garrison.crew - garrison.wounded
      ? garrison.raid - (garrison.workers - garrison.crew - garrison.wounded)
      : 0;
    deathCap += woundedInRaid;
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
    // 对标 legacy civics.js L2041-2111 lootModify / looters()
    // looters = min(garrison.raid, cap_per_tactic)
    // loot = base * Math.log(looters+1) * tactic_mult * gov.eco/100
    const looterCaps = [5, 10, 25, 50, 999];
    const looters = Math.min(garrison.raid, looterCaps[garrison.tactic]);
    const lootLogMult = Math.log(looters + 1);

    /**
     * 对标 legacy lootModify:
     *   loot = val * Math.log(looters+1) * tactic_mult * eco/100
     */
    function applyLootModify(val: number): number {
      const ecoFrac = (gov!.eco ?? 75) / 100;
      return Math.floor(val * lootLogMult * ecoFrac);
    }

    const loot: Record<string, number> = {};

    // Money — seededRandom(100, 375)
    const moneyBase = 100 + Math.floor(Math.random() * 276);
    loot['Money'] = applyLootModify(moneyBase);

    // 资源列表对标 legacy L1701-1715（基础 Phase 1：非 truepath，非特殊种族）
    const basic = ['Food', 'Lumber', 'Stone'];
    const common = ['Copper', 'Iron', 'Aluminium', 'Coal'];
    const rare = ['Cement', 'Steel'];

    /**
     * 各资源基础范围对标 legacy L1786-1826
     */
    function rollResource(res: string): number {
      switch (res) {
        case 'Food': return 40 + Math.floor(Math.random() * 136);    // seededRandom(40,175)
        case 'Lumber':
        case 'Stone': return 50 + Math.floor(Math.random() * 201);   // seededRandom(50,250)
        case 'Copper':
        case 'Iron':
        case 'Aluminium': return 35 + Math.floor(Math.random() * 91); // seededRandom(35,125)
        case 'Coal':
        case 'Cement': return 25 + Math.floor(Math.random() * 76);   // seededRandom(25,100)
        case 'Steel': return 20 + Math.floor(Math.random() * 46);    // seededRandom(20,65)
        case 'Titanium': return 12 + Math.floor(Math.random() * 21); // seededRandom(12,32)
        default: return 10 + Math.floor(Math.random() * 41);
      }
    }

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const addLoot = (res: string) => {
      if (!state.resource[res]?.display && res !== 'Steel' && res !== 'Titanium') return;
      const rolled = rollResource(res);
      loot[res] = (loot[res] ?? 0) + applyLootModify(rolled);
    };

    // tactic 0: basic×1 + (Money∪basic∪common)×1
    // tactic 1: basic×1 + common×1 + (all)×1
    // tactic 2: basic×1 + common×1 + (all)×1 + (common∪rare)×1
    // tactic 3/4: basic×1 + common×1 + rare×1 + (all)×1
    switch (garrison.tactic) {
      case 0:
        addLoot(pick(basic));
        addLoot(pick([...basic, ...common]));
        break;
      case 1:
        addLoot(pick(basic));
        addLoot(pick(common));
        addLoot(pick([...basic, ...common, ...rare]));
        break;
      case 2:
        addLoot(pick(basic));
        addLoot(pick(common));
        addLoot(pick([...basic, ...common, ...rare]));
        addLoot(pick([...common, ...rare]));
        break;
      case 3:
      case 4:
        addLoot(pick(basic));
        addLoot(pick(common));
        addLoot(pick(rare));
        addLoot(pick([...basic, ...common, ...rare]));
        break;
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
