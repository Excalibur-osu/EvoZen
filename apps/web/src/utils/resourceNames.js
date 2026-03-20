/**
 * 资源 ID → 中文名映射
 */
export const RESOURCE_NAMES = {
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
    Steel: '钢',
    Plywood: '胶合板',
    Brick: '砖',
    Wrought_Iron: '锻铁',
    Crates: '板条箱',
    Containers: '集装箱',
    RNA: 'RNA',
    DNA: 'DNA',
    Crystal: '水晶',
};
/** 获取资源中文名 */
export function getResourceName(id) {
    return RESOURCE_NAMES[id] ?? id;
}
