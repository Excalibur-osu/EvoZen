/**
 * 资源 ID → 中文名映射
 */
export const RESOURCE_NAMES: Record<string, string> = {
  Money: '金币',
  Food: '食物',
  Lumber: '木材',
  Stone: '石头',
  Furs: '毛皮',
  Copper: '铜',
  Iron: '铁',
  Cement: '水泥',
  Coal: '煤',
  Knowledge: '知识',
  Faith: '信仰',
  Steel: '钢',
  Aluminium: '铝',
  Oil: '石油',
  Titanium: '钛',
  Uranium: '铀',
  Plywood: '胶合板',
  Brick: '砖',
  Wrought_Iron: '锻铁',
  Sheet_Metal: '金属板',
  Alloy: '合金',
  Polymer: '聚合物',
  Crates: '板条箱',
  Containers: '集装箱',
  RNA: 'RNA',
  DNA: 'DNA',
  Crystal: '水晶',
  Iridium: '铱',
  Helium_3: '氦-3',
  Mythril: '秘银',
  Nano_Tube: '纳米管',
  Adamantite: '精金',
  Stanene: '锡烯',
  Soul_Gem: '灵魂宝石',
}

/** 获取资源中文名 */
export function getResourceName(id: string): string {
  return RESOURCE_NAMES[id] ?? id
}
