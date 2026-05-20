/**
 * 随机事件系统
 * 对标 legacy/src/events.js
 *
 * 事件分为两类：
 *   major — 影响较大（资源损失/大型奖励），约每 200 tick 触发一次
 *   minor — 小事件（文字/天气/小量资源），约每 499 tick 触发一次
 *
 * 调度器：使用 state.event.t / state.m_event.t 倒计时
 * 触发后随机选取可用事件，执行效果，重置倒计时并产生消息
 */

import type { GameState, GameMessage, GarrisonState } from '@evozen/shared-types';
import { armyRating, garrisonSize } from './military';

// ============================================================
// 类型定义
// ============================================================

export interface EventRequirements {
  /** 需要该科技已解锁（任意等级 ≥1） */
  tech?: string;
  /** 要求该科技未解锁 */
  notech?: string;
  /** 需要该资源显示 */
  resource?: string;
  /** 士气低于该值时才触发 */
  low_morale?: number;
}

export interface EventDefinition {
  id: string;
  type: 'major' | 'minor';
  reqs: EventRequirements;
  /** 额外条件检查，返回 true 时才加入候选池 */
  condition?: (state: GameState) => boolean;
  /** 事件效果，返回文字描述；允许直接修改传入的 state */
  effect: (state: GameState) => string;
}

// ============================================================
// 工具函数
// ============================================================

function techLevel(state: GameState, id: string): number {
  return state.tech[id] ?? 0;
}

function hasResource(state: GameState, id: string): boolean {
  return state.resource[id]?.display === true;
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 将 tick 数转换为可读时间字符串（基于 250ms/tick）
 * 300 tick → "约 1 分 15 秒"
 */
function ticksToTime(ticks: number): string {
  const seconds = Math.round(ticks * 0.25);
  if (seconds < 60) return `约 ${seconds} 秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `约 ${mins} 分 ${secs} 秒` : `约 ${mins} 分钟`;
}

function clampResource(state: GameState, id: string, delta: number): number {
  const res = state.resource[id];
  if (!res) return 0;
  const newAmt = Math.max(0, Math.min(res.amount + delta, res.max >= 0 ? res.max : Infinity));
  const actual = newAmt - res.amount;
  res.amount = newAmt;
  return Math.abs(actual);
}

// ============================================================
// 事件列表
// ============================================================

export const EVENTS: EventDefinition[] = [

  // ---- MAJOR 事件 ----

  // legacy events.js L43-51: inspiration
  {
    id: 'inspiration',
    type: 'major',
    reqs: { resource: 'Knowledge' },
    condition(state) {
      const species = state.race.species;
      return (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(state) {
      const ticks = rng(300, 600);
      state.race['inspired'] = ticks;
      return `💡 灵感迸发！一位市民灵光一闪，未来 ${ticksToTime(ticks)} 的知识产出提升 50%。`;
    },
  },

  // legacy events.js L53-61: motivation
  {
    id: 'motivation',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(state) {
      const ticks = rng(300, 600);
      state.race['motivated'] = ticks;
      return `💪 士气高涨！市民们干劲十足，未来 ${ticksToTime(ticks)} 所有产出 +5%。`;
    },
  },

  // legacy events.js L62-76: fire
  {
    id: 'fire',
    type: 'major',
    reqs: { resource: 'Lumber' },
    effect(state) {
      const lumber = state.resource['Lumber'];
      if (!lumber || lumber.amount <= 0) return '🔥 一场小火灾扑灭了，这次没有损失。';
      const loss = rng(1, Math.max(1, Math.floor(lumber.amount / 4)));
      clampResource(state, 'Lumber', -loss);
      return `🔥 火灾！木材仓库起火，损失了 ${loss} 木材！`;
    },
  },

  // legacy events.js L133-186: raid
  {
    id: 'raid',
    type: 'major',
    reqs: { tech: 'military', notech: 'world_control' },
    condition(state) {
      const foreign = state.civic.foreign;
      if (!foreign) return false;
      return (
        foreign.gov0.hstl > 60 ||
        foreign.gov1.hstl > 60 ||
        foreign.gov2.hstl > 60
      );
    },
    effect(state) {
      const garrison: GarrisonState = state.civic.garrison;
      const gSize = garrisonSize(state);
      const army = armyRating(gSize, state);
      const htLevel = techLevel(state, 'high_tech');
      const eAdv = htLevel > 0 ? htLevel + 1 : 1;
      const enemy = rng(25, 50) * eAdv;

      // 对标 legacy L150-152: seededRandom(0,n)=[0,n)，即 Math.floor(Math.random()*n)
      const injured = Math.min(garrison.wounded, gSize);
      const killed = injured > 0 ? Math.floor(Math.random() * injured) : 0;
      const availableToWound = Math.max(0, gSize - injured);
      const wounded = availableToWound > 0 ? Math.floor(Math.random() * availableToWound) : 0;

      // 扣除士兵
      if (killed > 0) {
        garrison.workers = Math.max(0, garrison.workers - killed);
        const species = state.race.species;
        const pop = state.resource[species];
        if (pop) pop.amount = Math.max(0, pop.amount - killed);
        state.stats.died = (state.stats.died ?? 0) + killed;
      }
      garrison.wounded = Math.min(garrison.workers, garrison.wounded + wounded);
      if (garrison.protest !== undefined) {
        garrison.protest = Math.min(100, (garrison.protest ?? 0) + 5);
      }

      if (army > enemy) {
        return `⚔️ 外敌来袭！守军成功击退入侵者。${killed > 0 ? `我方阵亡 ${killed} 人，` : ''}受伤 ${wounded} 人。`;
      } else {
        const loss = rng(1, Math.max(1, Math.floor((state.resource['Money']?.amount ?? 0) / 4)));
        const actualLoss = clampResource(state, 'Money', -loss);
        const lossText = actualLoss > 0 ? `损失金钱 ${actualLoss}，` : '';
        return `⚔️ 外敌来袭！守军寡不敌众，${lossText}${killed > 0 ? `阵亡 ${killed} 人，` : ''}受伤 ${wounded} 人。`;
      }
    },
  },

  // legacy events.js L529-545: mine_collapse
  {
    id: 'mine_collapse',
    type: 'major',
    reqs: { tech: 'mining' },
    condition(state) {
      const miner = state.civic['miner'] as { workers: number } | undefined;
      const species = state.race.species;
      return (miner?.workers ?? 0) > 0 && (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(state) {
      const species = state.race.species;
      const pop = state.resource[species];
      if (pop) pop.amount = Math.max(0, pop.amount - 1);
      const miner = state.civic['miner'] as { workers: number } | undefined;
      if (miner && miner.workers > 0) miner.workers--;
      (state.stats as { died?: number }).died = ((state.stats as { died?: number }).died ?? 0) + 1;
      return `⛏️ 矿井坍塌！一名矿工在事故中遇难。`;
    },
  },

  // legacy events.js L398-416: tax_revolt
  {
    id: 'tax_revolt',
    type: 'major',
    reqs: { tech: 'primitive', low_morale: 99 },
    condition(state) {
      const threshold = state.civic.govern?.type === 'oligarchy' ? 45 : 25;
      return (state.civic.taxes?.tax_rate ?? 20) > threshold;
    },
    effect(state) {
      const govType = state.civic.govern?.type ?? 'anarchy';
      const ramp = govType === 'oligarchy' ? 45 : 25;
      const taxRate = state.civic.taxes?.tax_rate ?? 20;
      const risk = (taxRate - ramp) * 0.04;
      const specialRes = new Set(['Soul_Gem', 'Corrupt_Gem', 'Codex', 'Demonic_Essence']);
      for (const [resId, res] of Object.entries(state.resource)) {
        if (specialRes.has(resId) || !res.display || res.amount <= 0) continue;
        const loss = rng(1, Math.max(1, Math.round(res.amount * risk)));
        res.amount = Math.max(0, res.amount - loss);
      }
      return `🗡️ 税收起义！过高的税率激起了民众抗议，资源遭受损失！`;
    },
  },

  // legacy events.js L187-235: siege（三国联合围城）
  // 条件：三邦都 hstl > 80 且无 world_control 科技
  {
    id: 'siege',
    type: 'major',
    reqs: { tech: 'military', notech: 'world_control' },
    condition(state) {
      const foreign = state.civic.foreign;
      if (!foreign) return false;
      return (
        foreign.gov0.hstl > 80 &&
        foreign.gov1.hstl > 80 &&
        foreign.gov2.hstl > 80
      );
    },
    effect(state) {
      const garrison: GarrisonState = state.civic.garrison;
      const gSize = garrisonSize(state);
      const army = armyRating(gSize, state);
      const htLevel = techLevel(state, 'high_tech');
      const eAdv = htLevel > 0 ? htLevel + 1 : 1;
      // 对标 legacy L202: enemy = (mil0+mil1+mil2) * eAdv
      const foreign = state.civic.foreign;
      const enemy = (foreign.gov0.mil + foreign.gov1.mil + foreign.gov2.mil) * eAdv;

      const injured = Math.min(garrison.wounded, gSize);
      const killed = injured > 0 ? Math.floor(Math.random() * injured) : 0;
      const availableToWound = Math.max(0, gSize - injured);
      const wounded = availableToWound > 0 ? Math.floor(Math.random() * availableToWound) : 0;

      if (killed > 0) {
        garrison.workers = Math.max(0, garrison.workers - killed);
        const species = state.race.species;
        const pop = state.resource[species];
        if (pop) pop.amount = Math.max(0, pop.amount - killed);
        state.stats.died = (state.stats.died ?? 0) + killed;
      }
      garrison.wounded = Math.min(garrison.workers, garrison.wounded + wounded);

      if (army > enemy) {
        return `🏰 三国联军围城！我方守军奋死抵抗，成功击退敌军。${killed > 0 ? `阵亡 ${killed} 人，` : ''}受伤 ${wounded} 人。`;
      } else {
        const loss = rng(1, Math.max(1, Math.floor((state.resource['Money']?.amount ?? 0) / 2)));
        const actualLoss = clampResource(state, 'Money', -loss);
        const lossText = actualLoss > 0 ? `损失金钱 ${actualLoss}，` : '';
        return `🏰 三国联军围城！守军寡不敌众，被迫割地赔款，${lossText}${killed > 0 ? `阵亡 ${killed} 人，` : ''}受伤 ${wounded} 人。`;
      }
    },
  },

  // legacy events.js L491-527: spy（外邦间谍事件——对方暗杀我方间谍）
  // 条件：某外邦有我方间谍（spy > 0）且未被占领/兼并/收购
  {
    id: 'enemy_spy',
    type: 'major',
    reqs: { tech: 'primitive', notech: 'world_control' },
    condition(state) {
      const foreign = state.civic.foreign;
      if (!foreign) return false;
      for (let i = 0; i < 3; i++) {
        const gov = foreign[`gov${i}` as keyof typeof foreign] as { spy: number; occ: boolean; anx: boolean; buy: boolean } | undefined;
        if (gov && gov.spy > 0 && !gov.occ && !gov.anx && !gov.buy) return true;
      }
      return false;
    },
    effect(state) {
      const foreign = state.civic.foreign;
      const targets: number[] = [];
      for (let i = 0; i < 3; i++) {
        const gov = foreign[`gov${i}` as keyof typeof foreign] as { spy: number; occ: boolean; anx: boolean; buy: boolean } | undefined;
        if (gov && gov.spy > 0 && !gov.occ && !gov.anx && !gov.buy) targets.push(i);
      }
      const govIdx = targets[Math.floor(Math.random() * targets.length)];
      const gov = foreign[`gov${govIdx}` as keyof typeof foreign] as { spy: number; act: string; sab: number };
      gov.spy = Math.max(0, gov.spy - 1);
      if (gov.spy === 0) {
        gov.act = 'none';
        gov.sab = 0;
      }
      return `🕵️ 国家 ${govIdx + 1} 发现了我方间谍并将其逮捕，间谍网络受损！`;
    },
  },

  // ---- MINOR 事件 ----

  // legacy events.js L804-826: heatwave（热浪）
  {
    id: 'heatwave',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.temp ?? 1) !== 2;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.temp = 2;
      return `☀️ 热浪来袭！气温急剧升高，田间作物受到轻微影响。`;
    },
  },

  // legacy events.js L828-854: coldsnap（寒流）
  {
    id: 'coldsnap',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.temp ?? 1) !== 0;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.temp = 0;
      return `❄️ 寒流突袭！气温骤降，请注意保障供暖。`;
    },
  },

  // legacy events.js L897-911: dark_cloud（乌云）
  {
    id: 'dark_cloud',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.weather ?? 2) !== 0;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.weather = 0;
      return `🌧️ 乌云密布，阴雨天气笼罩了城市。`;
    },
  },

  // legacy events.js L913-927: gloom（阴天）
  {
    id: 'gloom',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.weather ?? 2) !== 1;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.weather = 1;
      return `☁️ 天空布满积云，阴沉的天气让人提不起劲来。`;
    },
  },

  // legacy events.js L865: basicEvent('dollar','currency',...) - reqs: tech:currency
  {
    id: 'dollar',
    type: 'minor',
    reqs: { tech: 'currency' },
    effect(state) {
      const cash = rng(1, 10);
      clampResource(state, 'Money', cash);
      return `💰 路边发现了一笔意外之财，获得 ${cash} 金币！`;
    },
  },

  // legacy events.js L873: basicEvent('pickpocket','currency',...) - reqs: tech:currency
  {
    id: 'pickpocket',
    type: 'minor',
    reqs: { tech: 'currency' },
    effect(state) {
      const cash = rng(1, 10);
      clampResource(state, 'Money', -cash);
      return `🦹 有小偷！钱包里少了 ${cash} 金币。`;
    },
  },

  // legacy events.js shooting_star basicEvent
  {
    id: 'shooting_star',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(_state) {
      const quotes = [
        '🌠 夜空中划过一颗流星，让人不禁许下心愿。',
        '🌠 一道亮光划破夜空，消失在远方的地平线。',
        '🌠 流星雨！市民们仰头望天，欢呼雀跃。',
      ];
      return quotes[rng(0, quotes.length)];
    },
  },

  // legacy events.js meteor_shower basicEvent
  {
    id: 'meteor_shower',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(_state) {
      return `☄️ 壮观的流星雨划过星空，市民们驻足仰望，士气略有提升。`;
    },
  },

  // legacy events.js tumbleweed basicEvent
  {
    id: 'tumbleweed',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🌵 一团枯草随风滚过，什么都没有发生。`;
    },
  },

  // legacy events.js contest
  {
    id: 'contest',
    type: 'minor',
    reqs: { tech: 'science' },
    effect(_state) {
      const places = ['第一名', '第二名', '第三名'];
      const types = ['绘画比赛', '诗歌朗诵', '烹饪大赛', '数学竞赛', '体育运动会', '发明展览'];
      const place = places[rng(0, places.length)];
      const type = types[rng(0, types.length)];
      return `🏆 城市举办了${type}，我们的代表荣获${place}！`;
    },
  },

  // legacy events.js crop_circle
  {
    id: 'crop_circle',
    type: 'minor',
    reqs: { tech: 'agriculture' },
    effect(_state) {
      return `🌀 田野里出现了神秘的麦田怪圈，引发了市民的广泛猜测。`;
    },
  },

  // legacy events.js compass
  {
    id: 'compass',
    type: 'minor',
    reqs: { tech: 'mining' },
    effect(_state) {
      return `🧭 工人在矿场发现了一枚古老的指南针，正试图弄清楚它的来历。`;
    },
  },

  // legacy events.js tremor
  {
    id: 'tremor',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🌍 城市感受到轻微的地面震动，但没有造成损失。`;
    },
  },

  // legacy events.js bird
  {
    id: 'bird',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(_state) {
      const msgs = [
        '🐦 一只鸟在城门上停留片刻，好像在审视着我们。',
        '🦅 一只雄鹰在城市上空盘旋，象征着力量与自由。',
        '🐧 一只奇怪的鸟从北方飞来，市民们议论纷纷。',
      ];
      return msgs[rng(0, msgs.length)];
    },
  },

  // legacy events.js omen
  {
    id: 'omen',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(_state) {
      const omens = [
        '🔮 夜晚星象异常，占星师预言即将有大事发生。',
        '🌑 月食出现，城中老人说这是不祥之兆。',
        '🌅 日出时天空呈现罕见的红色，令人心生敬畏。',
      ];
      return omens[rng(0, omens.length)];
    },
  },

  // legacy events.js L935-948: llama（羊驼偷吃食物）
  // 条件：非肉食/非人工种族（Phase 1 简化：始终可触发）
  {
    id: 'llama',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.resource['Food']?.amount ?? 0) > 0;
    },
    effect(state) {
      // 对标 legacy L936: food = Math.rand(25,100)
      const food = rng(25, 100);
      clampResource(state, 'Food', -food);
      return `🦙 一群羊驼闯入粮仓，吃掉了约 ${food} 食物！`;
    },
  },

  // ==========================================================
  // 扩展事件（追加自 legacy events.js）
  // ==========================================================

  // legacy events.js L14-26: dna_replication
  {
    id: 'dna_replication',
    type: 'major',
    reqs: { resource: 'DNA' },
    condition(state) {
      return state.race.species === 'protoplasm';
    },
    effect(state) {
      const dna = state.resource['DNA'];
      if (!dna) return '🧬 DNA 复制错误。';
      const gain = rng(1, Math.max(1, Math.round(dna.max / 3)));
      dna.amount = Math.min(dna.max, dna.amount + gain);
      return `🧬 DNA 自我复制！获得 ${gain} DNA。`;
    },
  },

  // legacy events.js L28-40: rna_meteor
  {
    id: 'rna_meteor',
    type: 'major',
    reqs: { resource: 'RNA' },
    condition(state) {
      return state.race.species === 'protoplasm';
    },
    effect(state) {
      const rna = state.resource['RNA'];
      if (!rna) return '☄️ 富含 RNA 的陨石撞击。';
      const gain = rng(1, Math.max(1, Math.round(rna.max / 2)));
      rna.amount = Math.min(rna.max, rna.amount + gain);
      return `☄️ 富含 RNA 的陨石撞击地球！获得 ${gain} RNA。`;
    },
  },

  // legacy events.js L77-131: flare（行星耀斑，要求 ptrait:flare）
  {
    id: 'flare',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      const ptrait = (state.city as { ptrait?: string | string[] }).ptrait;
      if (Array.isArray(ptrait)) return ptrait.includes('flare');
      return ptrait === 'flare';
    },
    effect(state) {
      const species = state.race.species;
      const pop = state.resource[species];
      if (!pop) return '☀️ 恒星耀斑爆发！';
      const lost = Math.max(1, Math.floor(pop.amount * 0.05));
      pop.amount = Math.max(0, pop.amount - lost);
      state.stats.died = (state.stats.died ?? 0) + lost;
      return `☀️ 恒星耀斑爆发！强烈辐射导致 ${lost} 名市民死亡。`;
    },
  },

  // legacy events.js L300-332: terrorist
  {
    id: 'terrorist',
    type: 'major',
    reqs: { tech: 'world_control' },
    effect(state) {
      const garrison = state.civic.garrison;
      const wounded = Math.floor(Math.random() * Math.max(1, garrison.workers - garrison.wounded));
      const killed = Math.floor(Math.random() * Math.max(1, garrison.wounded));
      garrison.workers = Math.max(0, garrison.workers - killed);
      garrison.wounded = Math.min(garrison.workers, garrison.wounded + wounded);
      state.stats.died = (state.stats.died ?? 0) + killed;
      return killed > 0
        ? `💣 恐怖袭击！${killed} 名士兵阵亡，${wounded} 名受伤。`
        : `💣 恐怖袭击！${wounded} 名士兵受伤，无人阵亡。`;
    },
  },

  // legacy events.js L334-348: quake（地震，需 ptrait:unstable 且 notech:quaked）
  {
    id: 'quake',
    type: 'major',
    reqs: { tech: 'wsc', notech: 'quaked' },
    condition(state) {
      const ptrait = (state.city as { ptrait?: string | string[] }).ptrait;
      if (Array.isArray(ptrait)) return ptrait.includes('unstable');
      return ptrait === 'unstable';
    },
    effect(state) {
      state.tech['quaked'] = 1;
      return `🌋 灾难性大地震！整个星球摇晃不止，文明命悬一线（解锁 Cataclysm 转生）。`;
    },
  },

  // legacy events.js L349-363: doom（深井入侵）
  {
    id: 'doom',
    type: 'major',
    reqs: { tech: 'wsc', notech: 'portal_guard' },
    condition(state) {
      const sb = (state.space as Record<string, { on?: number }>)['space_barracks'];
      return !!(sb && (sb.on ?? 0) > 0);
    },
    effect(state) {
      (state.stats as Record<string, number>).portals = ((state.stats as Record<string, number>).portals ?? 0) + 1;
      return `👹 地狱深渊裂开！恶魔从异世界涌出，地狱门已开启！`;
    },
  },

  // legacy events.js L364-374: demon_influx（恶魔潮）
  {
    id: 'demon_influx',
    type: 'major',
    reqs: { tech: 'portal_guard' },
    effect(state) {
      const surge = rng(2500, 5000);
      const portal = state.portal as Record<string, Record<string, number>>;
      if (!portal['fortress']) portal['fortress'] = { threat: 0 };
      portal['fortress'].threat = (portal['fortress'].threat ?? 0) + surge;
      return `👹 恶魔潮汐！堡垒威胁等级 +${surge.toLocaleString()}。`;
    },
  },

  // legacy events.js L375-396: ruins（古代遗迹）
  {
    id: 'ruins',
    type: 'major',
    reqs: { resource: 'Knowledge' },
    condition(state) {
      return !!state.race['ancient_ruins'];
    },
    effect(state) {
      const resources = ['Iron', 'Copper', 'Steel', 'Cement'];
      const gains: string[] = [];
      for (const r of resources) {
        const res = state.resource[r];
        if (res?.display) {
          const gain = rng(1, Math.max(1, Math.round(res.max / 4)));
          res.amount = Math.min(res.max, res.amount + gain);
          gains.push(`${gain} ${r}`);
        }
      }
      return `🏛️ 探险队发现了古代遗迹！获得：${gains.join(', ') || '（无显著收获）'}`;
    },
  },

  // legacy events.js L420-456: protest（抗议，republic 政体下）
  {
    id: 'protest',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      return state.civic.govern?.type === 'republic';
    },
    effect(state) {
      const duration = rng(30, 60);
      (state.civic.govern as unknown as Record<string, unknown>)['protest'] = duration;
      const reasons = ['住房', '工资', '言论', '环保', '反战', '反税', '反腐', '宗教', '工作', '权利'];
      const reason = reasons[rng(0, reasons.length)];
      return `📢 抗议活动！市民走上街头要求${reason}改革，将持续 ${ticksToTime(duration)}。`;
    },
  },

  // legacy events.js L457-490: scandal（政治丑闻）
  {
    id: 'scandal',
    type: 'major',
    reqs: { tech: 'govern' },
    effect(state) {
      const duration = rng(15, 90);
      (state.civic.govern as unknown as Record<string, unknown>)['scandal'] = duration;
      const scandals = [
        '贪污受贿', '婚外情', '滥用职权', '逃税', '诽谤政敌',
        '徇私舞弊', '骗取选票', '私人飞机', '违反规定', '泄密',
      ];
      const scandal = scandals[rng(0, scandals.length)];
      return `📰 政坛丑闻！高官${scandal}案件曝光，民意大跌！`;
    },
  },

  // legacy events.js L547-583: klepto（盗贼，rogue trait）
  {
    id: 'klepto',
    type: 'major',
    reqs: { resource: 'Money' },
    condition(state) {
      return !!state.race['rogue'];
    },
    effect(state) {
      const candidates = ['Money', 'Food', 'Lumber', 'Stone', 'Iron', 'Coal', 'Steel'];
      const stealList = candidates.filter((r) => state.resource[r]?.display);
      if (stealList.length === 0) return '🦝 盗贼一无所获。';
      const res = stealList[rng(0, stealList.length)];
      const target = state.resource[res];
      const maxGain = Math.max(1, Math.round((state.stats['know'] as number ?? 0) / 25));
      const gain = rng(1, maxGain);
      if (target) {
        target.amount = target.max < 0 ? target.amount + gain : Math.min(target.max, target.amount + gain);
      }
      return `🦝 我们的盗贼带回了 ${gain} ${res}！`;
    },
  },

  // legacy events.js L288-298: witch_hunt_crusade（魔女审判）
  {
    id: 'witch_hunt_crusade',
    type: 'major',
    reqs: { tech: 'magic' },
    condition(state) {
      const sus = state.resource['Sus']?.amount ?? 0;
      return !!state.race['witch_hunter'] && sus >= 100;
    },
    effect(_state) {
      return `🔥 魔女狩猎十字军！邻邦被指控藏匿魔女，圣战开始！`;
    },
  },

  // legacy events.js L608-625: brawl（aggressive trait 主战）
  {
    id: 'brawl',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['aggressive'];
    },
    effect(state) {
      const garrison = state.civic.garrison;
      const dead = Math.min(garrison.workers, rng(1, 11));
      garrison.workers = Math.max(0, garrison.workers - dead);
      state.stats.died = (state.stats.died ?? 0) + dead;
      return `🥊 士兵爆发斗殴！${dead} 名士兵在混战中身亡。`;
    },
  },

  // legacy events.js L627-717: m_curious（好奇，curious trait）
  {
    id: 'm_curious',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return !!state.race['curious'] && (state.resource[species]?.amount ?? 0) >= 40;
    },
    effect(state) {
      const path = rng(0, 5);
      switch (path) {
        case 0: {
          const vol = rng(50000, 5_000_000);
          clampResource(state, 'Money', vol);
          return `🔍 一位市民找到了一笔财富！获得 ${vol.toLocaleString()} 金钱。`;
        }
        case 1: {
          const species = state.race.species;
          const pop = state.resource[species];
          if (pop) pop.amount = Math.max(0, pop.amount - 10);
          return `🔍 10 名市民因好奇心丧命。`;
        }
        case 2:
          state.race['inspired'] = rng(600, 1200);
          return `🔍 一位市民的探索带来了灵感爆发！`;
        case 3:
          state.race['distracted'] = rng(200, 600);
          return `🔍 市民们被一件趣事分心了。`;
        case 4:
          return `🔍 一位市民发现了奇怪的东西，但什么也没发生。`;
        default:
          return `🔍 没有什么有趣的发生。`;
      }
    },
  },

  // ---- 追加 minor 事件 ----

  // basicEvent: flashmob
  {
    id: 'flashmob',
    type: 'minor',
    reqs: { tech: 'high_tech' },
    effect(_state) {
      return `📱 市中心广场出现了一场快闪表演，市民们纷纷拍照留念。`;
    },
  },

  // basicEvent: cucumber
  {
    id: 'cucumber',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🥒 集市上出现了一根超大黄瓜，引来众人围观。`;
    },
  },

  // basicEvent: planking
  {
    id: 'planking',
    type: 'minor',
    reqs: { tech: 'high_tech' },
    effect(_state) {
      return `🪵 网络流行"平板挑战"，市民纷纷在奇怪地方躺平拍照。`;
    },
  },

  // basicEvent: furryfish
  {
    id: 'furryfish',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🐟 渔夫捞起一条长着毛皮的奇怪鱼，被博物馆征用。`;
    },
  },

  // basicEvent: hum
  {
    id: 'hum',
    type: 'minor',
    reqs: { tech: 'high_tech' },
    effect(_state) {
      return `🔊 整座城市听到一种神秘嗡嗡声，原因不明。`;
    },
  },

  // basicEvent: bloodrain
  {
    id: 'bloodrain',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🩸 天降血雨！这绝对不是什么好兆头。`;
    },
  },

  // basicEvent: haunting
  {
    id: 'haunting',
    type: 'minor',
    reqs: { tech: 'science' },
    effect(_state) {
      return `👻 城中传言某栋建筑闹鬼，市民们议论纷纷。`;
    },
  },

  // basicEvent: mothman
  {
    id: 'mothman',
    type: 'minor',
    reqs: { tech: 'science' },
    effect(_state) {
      return `🦋 有人在夜里目击到了天蛾人，引发了一阵恐慌。`;
    },
  },

  // basicEvent: dejavu
  {
    id: 'dejavu',
    type: 'minor',
    reqs: { tech: 'theology' },
    effect(_state) {
      return `🌀 整个城市的居民同时感受到了强烈的似曾相识感。`;
    },
  },

  // basicEvent: cloud
  {
    id: 'cloud',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      const shapes = ['一只兔子', '一艘飞船', '一头巨龙', '一张人脸', '一个王冠', '一颗心', '一座城堡', '一只猫', '一柄宝剑', '一颗树', '一辆马车'];
      return `☁️ 一朵奇特的云像极了${shapes[rng(0, shapes.length)]}。`;
    },
  },

  // basicEvent: tracks
  {
    id: 'tracks',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🐾 城外发现了奇怪的足迹，没有人能识别。`;
    },
  },

  // basicEvent: hoax
  {
    id: 'hoax',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🃏 有人散布了一个大型恶作剧，让全城上当。`;
    },
  },

  // basicEvent: burial
  {
    id: 'burial',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `⚱️ 考古发现了一座古老的墓地，引发了学术争议。`;
    },
  },

  // basicEvent: artifacts
  {
    id: 'artifacts',
    type: 'minor',
    reqs: { tech: 'high_tech' },
    effect(_state) {
      return `📜 考古队挖出一批古代文物，每件都让人困惑。`;
    },
  },

  // basicEvent: parade
  {
    id: 'parade',
    type: 'minor',
    reqs: { tech: 'world_control' },
    effect(_state) {
      return `🎉 城市举办了盛大游行，市民们欢欣鼓舞。`;
    },
  },

  // basicEvent: cat
  {
    id: 'cat',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🐱 一只流浪猫在市政厅前赖着不走，被市民收养。`;
    },
  },

  // basicEvent: theft
  {
    id: 'theft',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      const things = ['一袋面粉', '半罐糖', '一双鞋', '一面旗帜', '一袋金币', '一个雕像', '一本日记', '一把斧头', '一桶水', '一根胡萝卜'];
      return `🚨 有人偷走了${things[rng(0, things.length)]}！警卫正在调查。`;
    },
  },

  // basicEvent: bone
  {
    id: 'bone',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🦴 考古队挖出了奇怪的骨头碎片，专家们正在鉴定。`;
    },
  },

  // basicEvent: delicacy
  {
    id: 'delicacy',
    type: 'minor',
    reqs: { tech: 'high_tech' },
    effect(_state) {
      return `🍱 一道珍贵的料理风靡全城，餐厅排起长龙。`;
    },
  },

  // basicEvent: prank
  {
    id: 'prank',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `😜 几个年轻人搞了恶作剧，引来一阵笑声。`;
    },
  },

  // basicEvent: graffiti
  {
    id: 'graffiti',
    type: 'minor',
    reqs: { tech: 'science' },
    effect(_state) {
      return `🖌️ 市政大楼出现了神秘涂鸦，引发讨论。`;
    },
  },

  // basicEvent: soul
  {
    id: 'soul',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['soul_eater'];
    },
    effect(_state) {
      return `👁️ 黑暗中飘过几缕灵魂气息，让食魂者垂涎欲滴。`;
    },
  },

  // legacy events.js L964-980: cheese
  {
    id: 'cheese',
    type: 'minor',
    reqs: { tech: 'banking' },
    condition(state) {
      return (state.tech['banking'] ?? 0) >= 7;
    },
    effect(state) {
      const resets = (state.stats['reset'] as number) ?? 0;
      state.race['cheese'] = rng(10, 10 + resets);
      return `🧀 城市突然奉行了"奶酪运动"，市民们都开始痴迷于奶酪。`;
    },
  },

  // basicEvent: rumor
  {
    id: 'rumor',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      const rumors = [
        '邻邦元首是个机器人',
        '城东有座宝藏',
        '国王私通巫师',
        '魔法是真实的',
        '外星人正在监视',
        '地下生活着一群矮人',
        '巫师能预知未来',
        '城墙下埋有古老的怪物',
        '我们的钱币里藏有密码',
        '一些猫其实是间谍',
      ];
      return `📢 流言四起："${rumors[rng(0, rumors.length)]}"。`;
    },
  },

  // legacy events.js L986-1009: pet（宠物）
  {
    id: 'pet',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(state) {
      if ((state.race as Record<string, unknown>)['pet']) {
        const pet = state.race['pet'] as { event?: number };
        pet.event = (pet.event ?? 0) + rng(300, 600);
        return `🐾 城里的宠物又做了一件可爱的事情。`;
      } else {
        const petType = state.race['catnip']
          ? 'cat'
          : state.race['anise']
          ? 'dog'
          : rng(0, 2) === 0 ? 'cat' : 'dog';
        state.race['pet'] = { type: petType, name: rng(0, 12), event: 0, pet: 0 };
        return `🐾 市长养了一只${petType === 'cat' ? '猫' : '狗'}，全城都很喜欢！`;
      }
    },
  },

  // basicEvent: witch_hunt (minor variant)
  {
    id: 'witch_hunt',
    type: 'minor',
    reqs: { tech: 'magic' },
    condition(state) {
      const sus = state.resource['Sus']?.amount ?? 0;
      const scientist = (state.civic['scientist'] as { workers?: number } | undefined)?.workers ?? 0;
      return !!state.race['witch_hunter'] && sus >= 50 && scientist > 0;
    },
    effect(state) {
      const species = state.race.species;
      const pop = state.resource[species];
      if (pop) pop.amount = Math.max(0, pop.amount - 1);
      const scientist = state.civic['scientist'] as { workers?: number; assigned?: number };
      if (scientist) {
        scientist.workers = Math.max(0, (scientist.workers ?? 0) - 1);
        scientist.assigned = Math.max(0, (scientist.assigned ?? 0) - 1);
      }
      return `🧙 巫师猎人审判了一名科学家，1 名科学家被处决。`;
    },
  },

  // basicEvent: chicken (chicken trait variant)
  {
    id: 'chicken',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return !!state.race['chicken'] && (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(state) {
      const species = state.race.species;
      const pop = state.resource[species];
      if (pop) pop.amount = Math.max(0, pop.amount - 1);
      return `🍗 一只懦弱的市民被吃掉了，全城感到一丝凉意。`;
    },
  },

  // basicEvent: fight (aggressive trait minor variant)
  {
    id: 'fight',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      const species = state.race.species;
      return !!state.race['aggressive'] && (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(state) {
      const species = state.race.species;
      const dead = rng(1, 4);
      const pop = state.resource[species];
      if (pop) {
        const actual = Math.min(pop.amount, dead);
        pop.amount = Math.max(0, pop.amount - actual);
        state.stats.died = (state.stats.died ?? 0) + actual;
        return `🥊 几位市民因争吵爆发斗殴，${actual} 人不幸丧命。`;
      }
      return '🥊 几位市民因争吵打架，所幸无人死亡。';
    },
  },

  // legacy events.js L718-727: curious1
  {
    id: 'curious1',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['curious'];
    },
    effect(_state) {
      const observations = [
        '一只猫盯着虚空，仿佛看见了什么。',
        '一只鸟莫名其妙地飞向天空。',
        '河边有几条彩色的鱼。',
        '夜里听到奇怪的低语。',
        '集市上有人用奇怪的语言交谈。',
      ];
      return `🔍 ${observations[rng(0, observations.length)]}`;
    },
  },

  // legacy events.js L729-738: curious2
  {
    id: 'curious2',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['curious'];
    },
    effect(_state) {
      const observations = [
        '一位探险家带回了奇异的种子。',
        '挖掘队在地下发现了荧光蘑菇。',
        '天文学家观察到罕见的星象。',
        '商队带来了远方的传说。',
        '医生发现了新的药用植物。',
      ];
      return `🔍 ${observations[rng(0, observations.length)]}`;
    },
  },

  // slave_death1/2/3 (major)
  {
    id: 'slave_death1',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['slaver'];
    },
    effect(state) {
      const slaves = state.city['slave_pen'] as { count?: number; slaves?: number } | undefined;
      if (slaves?.slaves) slaves.slaves = Math.max(0, slaves.slaves - 1);
      return `⛓️ 一名奴隶因过度劳累死亡。`;
    },
  },
  {
    id: 'slave_death2',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['slaver'];
    },
    effect(state) {
      const slaves = state.city['slave_pen'] as { slaves?: number } | undefined;
      const dead = rng(2, 5);
      if (slaves?.slaves) slaves.slaves = Math.max(0, slaves.slaves - dead);
      return `⛓️ ${dead} 名奴隶在事故中丧生。`;
    },
  },
  {
    id: 'slave_death3',
    type: 'major',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['slaver'];
    },
    effect(state) {
      const slaves = state.city['slave_pen'] as { slaves?: number } | undefined;
      const dead = rng(5, 10);
      if (slaves?.slaves) slaves.slaves = Math.max(0, slaves.slaves - dead);
      return `⛓️ 严重事故！${dead} 名奴隶死亡。`;
    },
  },
  {
    id: 'slave_escape1',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['slaver'];
    },
    effect(state) {
      const slaves = state.city['slave_pen'] as { slaves?: number } | undefined;
      if (slaves?.slaves) slaves.slaves = Math.max(0, slaves.slaves - 1);
      return `🏃 一名奴隶趁夜逃跑了。`;
    },
  },
  {
    id: 'slave_escape2',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return !!state.race['slaver'];
    },
    effect(state) {
      const slaves = state.city['slave_pen'] as { slaves?: number } | undefined;
      const escaped = rng(2, 5);
      if (slaves?.slaves) slaves.slaves = Math.max(0, slaves.slaves - escaped);
      return `🏃 ${escaped} 名奴隶集体逃亡！`;
    },
  },
];

// ============================================================
// 事件池筛选
// ============================================================

function filterEvents(state: GameState, type: 'major' | 'minor', lastEventId: string | false): EventDefinition[] {
  return EVENTS.filter(ev => {
    if (ev.type !== type) return false;
    // 不连续触发同一事件
    if (ev.id === lastEventId) return false;

    const reqs = ev.reqs;
    if (reqs.tech && !techLevel(state, reqs.tech)) return false;
    if (reqs.notech && techLevel(state, reqs.notech) > 0) return false;
    if (reqs.resource && !hasResource(state, reqs.resource)) return false;
    if (reqs.low_morale !== undefined) {
      const currentMorale = state.city.morale?.current ?? 100;
      if (currentMorale >= reqs.low_morale) return false;
    }

    if (ev.condition && !ev.condition(state)) return false;
    return true;
  });
}

// ============================================================
// 主调度函数 — 在 tick.ts 中每 tick 调用
// ============================================================

/**
 * 推进事件计时器，到期时触发随机事件
 * @returns 本次触发的消息列表（0~1 条）
 */
export function tickEvents(state: GameState): GameMessage[] {
  const msgs: GameMessage[] = [];

  // --- Major 事件 ---
  // 对标 legacy L12720: Math.rand(0, event.t) === 0，即每 tick 有 1/t 的概率触发
  // 触发后重置 event.t = 999（legacy L12728）
  const majorT = state.event.t ?? 999;
  if (Math.floor(Math.random() * majorT) === 0) {
    const pool = filterEvents(state, 'major', state.event.l as string | false);
    if (pool.length > 0) {
      const ev = pool[rng(0, pool.length)];
      state.event.l = ev.id;
      const text = ev.effect(state);
      msgs.push({ text, type: 'warning', category: 'event' });
    }
    state.event.t = 999;
  } else {
    state.event.t = majorT - 1;
  }

  // --- Minor 事件 ---
  // 对标 legacy L12738: Math.rand(0, m_event.t) === 0，触发后重置 m_event.t = 850
  const minorT = state.m_event.t ?? 850;
  if (Math.floor(Math.random() * minorT) === 0) {
    const pool = filterEvents(state, 'minor', state.m_event.l as string | false);
    if (pool.length > 0) {
      const ev = pool[rng(0, pool.length)];
      state.m_event.l = ev.id;
      const text = ev.effect(state);
      msgs.push({ text, type: 'info', category: 'event' });
    }
    state.m_event.t = 850;
  } else {
    state.m_event.t = minorT - 1;
  }

  return msgs;
}
