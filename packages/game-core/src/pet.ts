/**
 * Pet 宠物系统 — 对标 legacy/src/events.js pet 事件
 *
 * 玩家通过 pet 事件获得猫/狗宠物，提供士气加成，互动产出资源/buff。
 */

import type { GameState } from '@evozen/shared-types';

export type PetType = 'cat' | 'dog';

export interface PetState {
  type: PetType;
  /** 名字索引（用于本地化文案选择） */
  name: number;
  /** 互动事件距下次触发还剩多少 tick */
  event: number;
  /** 累计互动次数 */
  pet: number;
}

/** 获取当前宠物状态 */
export function getPet(state: GameState): PetState | null {
  return (state.race['pet'] as PetState | undefined) ?? null;
}

/** 生成新宠物（事件触发时调用，受 catnip/anise trait 影响） */
export function spawnPet(state: GameState): PetState {
  let type: PetType;
  if (state.race['catnip']) {
    type = 'cat';
  } else if (state.race['anise']) {
    type = 'dog';
  } else {
    type = Math.random() < 0.5 ? 'cat' : 'dog';
  }
  const pet: PetState = {
    type,
    name: Math.floor(Math.random() * (type === 'cat' ? 12 : 10)),
    event: 600,  // 600 tick 后下次互动
    pet: 0,
  };
  state.race['pet'] = pet;
  return pet;
}

/** Pet tick：互动倒计时 + 互动事件 + 士气加成 */
export function petTick(state: GameState, timeMul: number): { interaction: boolean } {
  const pet = getPet(state);
  if (!pet) return { interaction: false };

  // 互动倒计时
  pet.event = Math.max(0, pet.event - timeMul);

  let interaction = false;
  if (pet.event <= 0) {
    pet.pet++;
    pet.event = 300 + Math.floor(Math.random() * 300);  // 下次 300-600 tick 后
    interaction = true;
    // 互动提供少量士气
    if (state.city.morale) {
      state.city.morale.entertain = (state.city.morale.entertain ?? 0) + 0.5;
    }
  }

  return { interaction };
}

/** 宠物提供的常驻士气加成（每只 +2 士气） */
export function getPetMoraleBonus(state: GameState): number {
  return getPet(state) ? 2 : 0;
}

/** 移除宠物 */
export function removePet(state: GameState): void {
  delete state.race['pet'];
}

/** 互动描述（用于事件日志/UI） */
export function getPetInteractionText(type: PetType): string {
  const catTexts = [
    '🐱 蹭了蹭你的腿', '🐱 在窗台晒太阳', '🐱 抓了一只老鼠', '🐱 打翻了花瓶',
    '🐱 蜷缩在你的腿上', '🐱 用爪子拍门', '🐱 玩耍逗猫棒', '🐱 偷吃食物',
  ];
  const dogTexts = [
    '🐶 摇着尾巴迎接你', '🐶 追逐自己的尾巴', '🐶 叼回了树枝', '🐶 趴在你身边睡觉',
    '🐶 兴奋地吠叫', '🐶 想去散步', '🐶 在花园挖洞', '🐶 摇尾巴讨抚摸',
  ];
  const texts = type === 'cat' ? catTexts : dogTexts;
  return texts[Math.floor(Math.random() * texts.length)];
}
