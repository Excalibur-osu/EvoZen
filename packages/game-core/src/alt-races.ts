import type { GameState } from '@evozen/shared-types';
import { RACES, type RaceDefinition, type RaceId } from './races';

export interface AltRaceView {
  raceId: RaceId;
  altId: string;
  event: 'xmas' | 'easter' | 'thanksgiving' | 'valentine' | 'halloween';
  name: string;
  desc: string;
  home: string;
  entity: string;
}

type AltRaceDef = Omit<AltRaceView, 'raceId'>;

const XMAS_RACES = new Set<RaceId>(['elven', 'capybara', 'centaur', 'wendigo', 'entish', 'yeti']);
const EASTER_RACES = new Set<RaceId>(['wolven', 'vulpine']);
const THANKSGIVING_RACES = new Set<RaceId>(['arraak']);
const VALENTINE_RACES = new Set<RaceId>(['seraph']);
const HALLOWEEN_RACES = new Set<RaceId>(['human', 'tortoisan', 'unicorn', 'junker']);

const ALT_RACE_VIEWS: Partial<Record<RaceId, AltRaceDef>> = {
  human: {
    altId: 'zombie',
    event: 'halloween',
    name: '僵尸',
    desc: '僵尸并不是一个物种，他们只是被某种恐怖病毒附身之后的产物，依然蹒跚地游荡着。',
    home: '坟墓',
    entity: '腐败的两足动物',
  },
  elven: {
    altId: 'xmas_elf',
    event: 'xmas',
    name: '圣诞精灵',
    desc: '精灵们常年在车间里工作，为大家制造玩具。',
    home: '北极',
    entity: '尖耳的玩具生产者',
  },
  wolven: {
    altId: 'rabbit',
    event: 'easter',
    name: '兔子',
    desc: '兔子喜欢蹦蹦跳跳，他们繁殖迅速，且超级好动。',
    home: '巧克力',
    entity: '兔类动物',
  },
  vulpine: {
    altId: 'chocolate_rabbit',
    event: 'easter',
    name: '巧克甜兔',
    desc: '巧克甜兔过于美味，以至于它们会尝试吃掉同类。',
    home: '黑巧克力',
    entity: '美味的兔类动物',
  },
  centaur: {
    altId: 'reindeer',
    event: 'xmas',
    name: '驯鹿',
    desc: '驯鹿是高度群居的动物，极善于拉雪橇，可以运送大量礼物。',
    home: '北极',
    entity: '角鹿',
  },
  capybara: {
    altId: 'donkey',
    event: 'xmas',
    name: '毛驴',
    desc: '毛驴是适应能力极强的野兽，擅长爬山。',
    home: '多米尼克',
    entity: '毛驴',
  },
  tortoisan: {
    altId: 'ninja_turtle',
    event: 'halloween',
    name: '忍者龟',
    desc: '忍者龟精通武艺，喜欢吃披萨。',
    home: '下水道',
    entity: '半壳忍者',
  },
  arraak: {
    altId: 'turkey',
    event: 'thanksgiving',
    name: '火鸡',
    desc: '火鸡浑身长满羽毛，配上肉汁和土豆泥味道很棒。',
    home: '炸鸡',
    entity: '美味的鸟类动物',
  },
  entish: {
    altId: 'spruce',
    event: 'xmas',
    name: '云杉树人',
    desc: '云杉树人喜欢在节日用饰品互相炫耀。',
    home: '客厅',
    entity: '有装饰的树',
  },
  yeti: {
    altId: 'snowman',
    event: 'xmas',
    name: '雪人',
    desc: '雪人是由雪堆构成的类人生物。',
    home: '霜冻',
    entity: '雪人',
  },
  wendigo: {
    altId: 'krampus',
    event: 'xmas',
    name: '坎卜斯',
    desc: '坎卜斯是专门折磨不听话坏孩子的恐怖生物。',
    home: '坎卜斯之夜',
    entity: '节日恐怖生物',
  },
  seraph: {
    altId: 'cherub',
    event: 'valentine',
    name: '小天使',
    desc: '小天使胖乎乎的，背后长着翅膀，会用箭射穿你的心。',
    home: '丘比特',
    entity: '天使宝宝',
  },
  unicorn: {
    altId: 'emocorn',
    event: 'halloween',
    name: '黑化独角兽',
    desc: '黑化独角兽不再属于光明和快乐，而是代表着黑暗和悲伤。',
    home: '哥特',
    entity: '黑化独角马',
  },
  junker: {
    altId: 'ghoul',
    event: 'halloween',
    name: '食尸鬼',
    desc: '当灵魂世界的封印松动时，食尸鬼就重现人间了。',
    home: '墓园',
    entity: '不死族生物',
  },
};

export function getAltRaceView(
  raceId: string,
  state?: GameState,
  date: Date = new Date()
): AltRaceView | null {
  if (!(raceId in RACES)) return null;
  if (areAltRacesDisabled(state)) {
    delete state?.race?.['hrt'];
    return null;
  }
  const id = raceId as RaceId;
  const forced = state?.race?.['hrt'] === id;
  if (!forced && !isAltRaceActive(id, date)) return null;
  const view = ALT_RACE_VIEWS[id];
  return view ? { raceId: id, ...view } : null;
}

export function applyAltRaceLock(
  state: GameState,
  raceId: string,
  date: Date = new Date()
): AltRaceView | null {
  if (areAltRacesDisabled(state)) {
    delete state.race['hrt'];
    return null;
  }
  if (!(raceId in RACES)) {
    delete state.race['hrt'];
    return null;
  }
  const id = raceId as RaceId;
  if (!isAltRaceActive(id, date)) {
    delete state.race['hrt'];
    return null;
  }
  state.race['hrt'] = id;
  return getAltRaceView(raceId, state, date);
}

export function applyAltRaceTraits(
  state: GameState,
  raceId: string,
  date: Date = new Date()
): boolean {
  if (areAltRacesDisabled(state)) return false;
  if (!(raceId in RACES)) return false;
  const id = raceId as RaceId;
  if (!isAltRaceActive(id, date)) return false;

  const traits = getAltRaceTraitOverrides(id, date);
  if (!traits) return false;
  for (const [trait, rank] of Object.entries(traits.set)) {
    state.race[trait] = rank;
  }
  for (const trait of traits.delete ?? []) {
    delete state.race[trait];
  }
  return true;
}

export function getRaceDisplayDefinition(
  raceId: string,
  state?: GameState,
  date: Date = new Date()
): RaceDefinition | (RaceDefinition & AltRaceView) | null {
  if (!(raceId in RACES)) return null;
  const race = RACES[raceId as RaceId];
  const alt = getAltRaceView(raceId, state, date);
  return alt ? { ...race, ...alt } : race;
}

export function isAltRaceActive(raceId: RaceId, date: Date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  if (XMAS_RACES.has(raceId)) return month === 11 && day >= 17;
  if (EASTER_RACES.has(raceId)) return isEasterActive(date);
  if (THANKSGIVING_RACES.has(raceId)) return month === 10 && day >= 22 && day <= 28;
  if (VALENTINE_RACES.has(raceId)) return month === 1 && day === 14;
  if (HALLOWEEN_RACES.has(raceId)) return isHalloweenActive(date);
  return false;
}

function isEasterActive(date: Date): boolean {
  const year = date.getFullYear();
  const [month, day] = getEasterDate(year);
  const start = new Date(year, month, day);
  const end = new Date(year, month, day + 10);
  return date >= start && date <= end;
}

function isHalloweenActive(date: Date): boolean {
  const year = date.getFullYear();
  return date >= new Date(year, 9, 28) && date <= new Date(year, 10, 4);
}

function areAltRacesDisabled(state?: GameState): boolean {
  return Boolean(state?.settings?.boring);
}

function getEasterDate(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

function getAltRaceTraitOverrides(
  raceId: RaceId,
  date: Date
): { set: Record<string, number>; delete?: string[] } | null {
  if (isChristmasDate(date)) {
    switch (raceId) {
      case 'elven':
        return { set: { slaver: 2, resourceful: 0.5, small: 0.25 } };
      case 'capybara':
        return { set: { beast_of_burden: 1, pack_rat: 0.5, musical: 0.25 } };
      case 'centaur':
        return { set: { beast_of_burden: 1, curious: 0.5, blissful: 0.25 } };
      case 'wendigo':
        return { set: { immoral: 3, cannibalize: 0.5, claws: 0.25 } };
      case 'yeti':
        return { set: { scavenger: 3, regenerative: 0.5, musical: 0.25 } };
      case 'entish':
        return { set: { photosynth: 3, optimistic: 0.5, armored: 0.25 } };
    }
  }

  if (isEasterActive(date)) {
    switch (raceId) {
      case 'wolven':
        return { set: { hyper: 1, fast_growth: 1, rainbow: 1, optimistic: 1 } };
      case 'vulpine':
        return { set: { cannibalize: 2, rage: 1, blood_thirst: 1, sticky: 1 } };
    }
  }

  if (isHalloweenActive(date)) {
    switch (raceId) {
      case 'unicorn':
        return { set: { gloomy: 1, darkness: 1 }, delete: ['rainbow'] };
      case 'human':
        return { set: { anthropophagite: 1, cannibalize: 2, infectious: 3 } };
      case 'tortoisan':
        return { set: { hyper: 0.25, swift: 0.5, infiltrator: 1 }, delete: ['slow'] };
    }
  }

  return null;
}

function isChristmasDate(date: Date): boolean {
  return date.getMonth() === 11 && date.getDate() >= 17;
}
