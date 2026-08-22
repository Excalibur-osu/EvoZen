/**
 * 资源定义
 * 从旧 src/resources.js 提取纯数据
 */

/** 资源价值表 */
export const RESOURCE_VALUES: Record<string, number> = {
  Food: 5,
  Lumber: 5,
  Stone: 5,
  Furs: 8,
  Copper: 25,
  Iron: 40,
  Aluminium: 50,
  Cement: 15,
  Coal: 20,
  Oil: 75,
  Uranium: 550,
  Steel: 100,
  Titanium: 150,
  Alloy: 350,
  Polymer: 250,
  Iridium: 420,
  Mythril: 94.239,
  Nano_Tube: 750,
  Adamantite: 2250,
  Stanene: 3600,
  Unobtainium: 168.59,
};

/** 贸易比率 */
export const TRADE_RATIOS: Record<string, number> = {
  Food: 2,
  Lumber: 2,
  Stone: 2,
  Furs: 1,
  Copper: 1,
  Iron: 1,
  Aluminium: 1,
  Cement: 1,
  Coal: 1,
  Oil: 0.5,
  Steel: 0.5,
  Titanium: 0.25,
};

/** 合成配方 */
export interface CraftRecipe {
  resource: string;
  amount: number;
}

export const CRAFT_COSTS: Record<string, CraftRecipe[]> = {
  Plywood: [{ resource: 'Lumber', amount: 100 }],
  Brick: [{ resource: 'Cement', amount: 40 }],
  Wrought_Iron: [{ resource: 'Iron', amount: 80 }],
  Sheet_Metal: [{ resource: 'Aluminium', amount: 120 }],
  Mythril: [{ resource: 'Iridium', amount: 100 }, { resource: 'Alloy', amount: 250 }],
  Aerogel: [{ resource: 'Graphene', amount: 2500 }, { resource: 'Infernite', amount: 50 }],
  Nanoweave: [{ resource: 'Nano_Tube', amount: 1000 }, { resource: 'Vitreloy', amount: 40 }],
  Scarletite: [{ resource: 'Iron', amount: 250000 }, { resource: 'Adamantite', amount: 7500 }, { resource: 'Orichalcum', amount: 500 }],
  Quantium: [{ resource: 'Nano_Tube', amount: 1000 }, { resource: 'Graphene', amount: 1000 }, { resource: 'Elerium', amount: 25 }],
  Thermite: [{ resource: 'Iron', amount: 180 }, { resource: 'Aluminium', amount: 60 }],
};
