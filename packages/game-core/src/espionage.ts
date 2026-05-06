import type { GameState, GameMessage, ForeignGovState } from '@evozen/shared-types';

export function getSpyCost(state: GameState, govIndex: number): number {
  const gov = getForeignGov(state, govIndex);
  if (!gov) return Infinity;

  let base = Math.round((gov.mil / 2) + (gov.hstl / 2) - gov.unrest) + 10;
  if (base < 50) {
    base = 50;
  }
  
  // NOTE: infiltrator trait and astrology (Scorpio) omissions due to simplified races
  return Math.round(Math.pow(base, gov.spy + 1)) + 500;
}

export function trainSpy(state: GameState, govIndex: number): { success: boolean; cost: number; messages: GameMessage[] } {
  const gov = getForeignGov(state, govIndex);
  const techLvl = state.tech['spy'] ?? 0;
  const messages: GameMessage[] = [];

  if (!gov || techLvl < 1 || gov.trn > 0) {
    return { success: false, cost: 0, messages };
  }

  const cost = getSpyCost(state, govIndex);
  if (state.resource.Money.amount >= cost) {
    state.resource.Money.amount -= cost;
    
    let time = 300;
    // 对标 legacy civics.js L774-779: spy>=3 时 time -= bootCamp.count * 10，min 10
    if (techLvl >= 3) {
      const bootCampCount = (state.city['boot_camp'] as { count?: number })?.count ?? 0;
      if (bootCampCount > 0) {
        time -= bootCampCount * 10;
        if (time < 10) time = 10;
      }
    }
    gov.trn = time;
    return { success: true, cost, messages };
  }

  return { success: false, cost: 0, messages };
}

export function startSpyAction(state: GameState, govIndex: number, action: string): { success: boolean; messages: GameMessage[] } {
  const gov = getForeignGov(state, govIndex);
  const techLvl = state.tech['spy'] ?? 0;
  const messages: GameMessage[] = [];

  if (!gov || techLvl < 2 || gov.spy < 1 || gov.sab > 0) {
    return { success: false, messages };
  }

  // Action specific constraints
  if (action === 'incite' && govIndex >= 3) return { success: false, messages };
  if (action === 'annex' || action === 'purchase') {
    if (govIndex >= 3) return { success: false, messages };
    const moraleReady = (state.city.morale?.current ?? 0) >= (200 + gov.hstl - gov.unrest);
    if (action === 'annex') {
      if (gov.hstl > 50 || gov.unrest < 50 || !moraleReady) return { success: false, messages };
    }
    if (action === 'purchase') {
      if (gov.spy < 3) return { success: false, messages };
      
      const price = getGovPurchasePrice(state, govIndex);
      if (state.resource.Money.amount < price) return { success: false, messages };
      state.resource.Money.amount -= price;
    }
  }

  // 对标 legacy civics.js L812-857 spyAction():
  // influence: spy>=4?200:300, spy=1:*1.5, spy>=3: -(spy-2)*50, min 50
  // sabotage:  spy>=4?400:600, spy>=2: -(spy-1)*50, min 50
  // incite:    spy>=4?600:900, spy<=2:*1.5, spy>=4: -(spy-3)*100, min 100
  // annex/purchase: spy>=4?150:300
  const numSpies = gov.spy;
  let timer: number;
  switch (action) {
    case 'influence': {
      timer = techLvl >= 4 ? 200 : 300;
      if (numSpies === 1) { timer = Math.round(timer * 1.5); }
      else if (numSpies >= 3) { timer -= (numSpies - 2) * 50; }
      timer = Math.max(timer, 50);
      break;
    }
    case 'sabotage': {
      timer = techLvl >= 4 ? 400 : 600;
      if (numSpies >= 2) { timer -= (numSpies - 1) * 50; }
      timer = Math.max(timer, 50);
      break;
    }
    case 'incite': {
      timer = techLvl >= 4 ? 600 : 900;
      if (numSpies <= 2) { timer = Math.round(timer * 1.5); }
      else if (numSpies >= 4) { timer -= (numSpies - 3) * 100; }
      timer = Math.max(timer, 100);
      break;
    }
    default: // annex / purchase
      timer = techLvl >= 4 ? 150 : 300;
  }
  gov.sab = Math.ceil(timer);
  gov.act = action;

  return { success: true, messages };
}

export function getGovPurchasePrice(state: GameState, govIndex: number): number {
  // 对标 legacy civics.js L789-793 govPrice():
  //   price = eco * 15384 * (1 + hstl*1.6/100) * (1 - unrest*0.25/100)
  const gov = getForeignGov(state, govIndex);
  if (!gov) return Infinity;
  let price = gov.eco * 15384;
  price *= 1 + gov.hstl * 1.6 / 100;
  price *= 1 - gov.unrest * 0.25 / 100;
  return Math.round(price);
}

export function resolveSpyActionTick(state: GameState, govIndex: number, _: number): GameMessage[] {
  const gov = getForeignGov(state, govIndex);
  if (!gov) return [];
  const messages: GameMessage[] = [];

  // Trn Tick
  if (gov.trn > 0) {
    gov.trn--;
    if (gov.trn <= 0) {
      gov.trn = 0;
      gov.spy++;
      messages.push({
        text: `在国家 ${govIndex} 的间谍招募并训练完成了。`,
        type: 'info',
        category: 'spy'
      });
    }
  }

  // Sab Tick
  if (gov.sab > 0) {
    gov.sab--;
    if (gov.sab <= 0) {
      gov.sab = 0;
      
      const techLvl = state.tech['spy'] ?? 0;
      // 这里的 catchMod 先用固定的 0（后续有政体或者防御科技等影响可以叠加）
      const spyCatchMod = 0;

      switch (gov.act) {
        case 'influence':
          if (Math.floor(Math.random() * (4 + spyCatchMod)) === 0) {
            messages.push(...handleSpyCaught(state, govIndex));
          } else {
            // 对标 legacy L10545: seededRandom(spy>=5?2:1, spy>=5?8:6)
            // seededRandom(min,max)=[min,max)，等价：low: 1~5，high: 2~7
            const covert = (techLvl >= 5 ? 2 : 1) + Math.floor(Math.random() * (techLvl >= 5 ? 6 : 5));
            gov.hstl = Math.max(0, gov.hstl - covert);
            messages.push({
              text: `影响行动成功！该国对我们的敌意降低了 ${covert} 点。`,
              type: 'success',
              category: 'spy'
            });
          }
          break;

        case 'sabotage':
          if (Math.floor(Math.random() * (3 + spyCatchMod)) === 0) {
            messages.push(...handleSpyCaught(state, govIndex));
          } else {
            // 对标 legacy L10561: seededRandom(spy>=5?2:1, spy>=5?8:6)
            const covert = (techLvl >= 5 ? 2 : 1) + Math.floor(Math.random() * (techLvl >= 5 ? 6 : 5));
            gov.mil = Math.max(50, gov.mil - covert);
            messages.push({
              text: `破坏成功！该国军事实力被削弱了。`,
              type: 'success',
              category: 'spy'
            });
          }
          break;

        case 'incite':
          if (Math.floor(Math.random() * (2 + Math.floor(spyCatchMod / 2))) === 0) {
            messages.push(...handleSpyCaught(state, govIndex));
          } else {
            // 对标 legacy L10577: seededRandom(spy>=5?2:1, spy>=5?8:6)
            const covert = (techLvl >= 5 ? 2 : 1) + Math.floor(Math.random() * (techLvl >= 5 ? 6 : 5));
            gov.unrest = Math.min(100, gov.unrest + covert);
            messages.push({
              text: `煽动成功！该国暴乱率上升了 ${covert}%。`,
              type: 'success',
              category: 'spy'
            });
          }
          break;

        case 'annex':
          if (govIndex < 3) {
            gov.anx = true;
            messages.push({
              text: `间谍网已成功颠覆当局，该国已被你兵不血刃地兼并！`,
              type: 'success',
              category: 'spy'
            });
          }
          break;

        case 'purchase':
          if (govIndex < 3) {
            gov.buy = true;
            messages.push({
              text: `跨国贿赂与收买已顺利完成，该国已被我们的金钱彻底吞并！`,
              type: 'success',
              category: 'spy'
            });
          }
          break;
      }
    }
  }

  return messages;
}

function handleSpyCaught(state: GameState, govIndex: number): GameMessage[] {
  const gov = getForeignGov(state, govIndex);
  if (!gov) return [];

  const escape = Math.floor(Math.random() * 3) === 0;
  const msgs: GameMessage[] = [];

  if (!escape && gov.spy > 0) {
    gov.spy--;
    msgs.push({
      text: `你的间谍暴露了！间谍在突围中牺牲...`,
      type: 'danger',
      category: 'spy'
    });
    
    // 对标 legacy L12961-12967: Math.floor(seededRandom(0,4))===0 → hstl += seededRandom(1, max)
    // max = mistrustful ? 5+trait_val : 5, Phase 1 简化 max=5
    // seededRandom(1,5)=[1,5) → 1~4
    if (Math.floor(Math.random() * 4) === 0) {
      const hstlInc = 1 + Math.floor(Math.random() * 4); // [1,4]
      gov.hstl = Math.min(100, gov.hstl + hstlInc);
      msgs.push({
        text: `被捕间谍出卖了情报，该国敌意加剧！`,
        type: 'danger',
        category: 'spy'
      });
    }
  } else {
    msgs.push({
      text: `虽然情报网面临暴露，但我方间谍成功撤离并隐蔽！`,
      type: 'warning',
      category: 'spy'
    });
  }
  
  return msgs;
}

function getForeignGov(state: GameState, govIndex: number): ForeignGovState | undefined {
  return state.civic.foreign[`gov${govIndex}` as keyof typeof state.civic.foreign] as ForeignGovState | undefined;
}
