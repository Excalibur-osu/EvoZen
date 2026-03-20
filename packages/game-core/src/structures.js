/**
 * 基础建筑定义
 * 从旧 src/actions.js 提取第一阶段建筑
 */
// 通用费用递增公式
function scaleCost(base, mult) {
    return (_state, count) => Math.ceil(base * Math.pow(mult, count));
}
/** 第一阶段基础建筑 */
export const BASIC_STRUCTURES = [
    // ---- 住房 ----
    {
        id: 'basic_housing',
        name: '小屋',
        description: '为市民提供基本住所。',
        category: 'housing',
        reqs: { housing: 1 },
        costs: {
            Lumber: scaleCost(10, 1.23),
        },
        effect: '市民上限 +1',
    },
    {
        id: 'cottage',
        name: '茅屋',
        description: '更好的住所，可以容纳更多人。',
        category: 'housing',
        reqs: { housing: 2 },
        costs: {
            Lumber: scaleCost(25, 1.25),
            Stone: scaleCost(12, 1.25),
            Iron: scaleCost(5, 1.25),
        },
        effect: '市民上限 +2',
    },
    // ---- 食物 ----
    {
        id: 'farm',
        name: '农场',
        description: '生产食物的基础设施。',
        category: 'food',
        reqs: { agriculture: 1 },
        costs: {
            Lumber: scaleCost(20, 1.36),
            Stone: scaleCost(10, 1.36),
        },
        effect: '允许农民工作以获得更高效的食物产量。',
    },
    {
        id: 'mill',
        name: '磨坊',
        description: '利用风力磨碎谷物，提高食物产量。',
        category: 'food',
        reqs: { agriculture: 4 },
        costs: {
            Lumber: scaleCost(65, 1.32),
            Iron: scaleCost(33, 1.32),
            Cement: scaleCost(20, 1.32),
        },
        effect: '食物产量 +5%',
    },
    // ---- 基础资源 ----
    {
        id: 'lumber_yard',
        name: '伐木场',
        description: '增加木材存储并提升产量。',
        category: 'resource',
        reqs: { axe: 1 },
        costs: {
            Lumber: scaleCost(18, 1.26),
            Stone: scaleCost(8, 1.26),
        },
        effect: '木材上限 +100，伐木工效率 +2%',
    },
    {
        id: 'rock_quarry',
        name: '采石场',
        description: '增加石头存储并提升产量。',
        category: 'resource',
        reqs: { mining: 1 },
        costs: {
            Lumber: scaleCost(20, 1.36),
            Stone: scaleCost(16, 1.36),
        },
        effect: '石头上限 +100，石工效率 +2%',
    },
    {
        id: 'mine',
        name: '矿井',
        description: '开采地下矿物。',
        category: 'resource',
        reqs: { mining: 2 },
        costs: {
            Lumber: scaleCost(60, 1.36),
            Stone: scaleCost(18, 1.36),
        },
        effect: '解锁矿工岗位。',
        powered: true,
        powerCost: 1,
    },
    {
        id: 'coal_mine',
        name: '煤矿',
        description: '开采煤炭资源。',
        category: 'resource',
        reqs: { mining: 4 },
        costs: {
            Lumber: scaleCost(250, 1.36),
            Iron: scaleCost(180, 1.32),
        },
        effect: '解锁煤矿工人岗位。',
        powered: true,
        powerCost: 1,
    },
    {
        id: 'cement_plant',
        name: '水泥厂',
        description: '生产水泥。',
        category: 'resource',
        reqs: { cement: 1 },
        costs: {
            Lumber: scaleCost(40, 1.36),
            Stone: scaleCost(50, 1.36),
        },
        effect: '解锁水泥工人岗位。',
    },
    // ---- 存储 ----
    {
        id: 'silo',
        name: '粮仓',
        description: '增加食物存储上限。',
        category: 'storage',
        reqs: { agriculture: 3 },
        costs: {
            Lumber: scaleCost(55, 1.32),
            Cement: scaleCost(20, 1.32),
        },
        effect: '食物上限 +250',
    },
    {
        id: 'shed',
        name: '仓库',
        description: '增加多种资源存储上限。',
        category: 'storage',
        reqs: { container: 1 },
        costs: {
            Lumber: scaleCost(30, 1.22),
            Stone: scaleCost(15, 1.22),
        },
        effect: '木材/石头等上限 +100，提供板条箱位。',
    },
    // ---- 商业 ----
    {
        id: 'bank',
        name: '银行',
        description: '管理金钱与税收。',
        category: 'commerce',
        reqs: { banking: 1 },
        costs: {
            Lumber: scaleCost(75, 1.32),
            Stone: scaleCost(100, 1.32),
        },
        effect: '金钱上限 +1800，解锁银行家岗位。',
    },
    {
        id: 'trade_post',
        name: '贸易站',
        description: '与商人交易资源。',
        category: 'commerce',
        reqs: { trade: 1 },
        costs: {
            Lumber: scaleCost(60, 1.36),
            Stone: scaleCost(40, 1.36),
        },
        effect: '解锁贸易路线，可以买卖资源。',
    },
    // ---- 科学 ----
    {
        id: 'library',
        name: '图书馆',
        description: '存储知识，提供研究能力。',
        category: 'science',
        reqs: { science: 1 },
        costs: {
            Lumber: scaleCost(45, 1.2),
            Furs: scaleCost(22, 1.2),
            Cement: scaleCost(10, 1.2),
        },
        effect: '知识上限 +125。',
    },
    {
        id: 'university',
        name: '大学',
        description: '高等教育机构，大幅增加知识上限。',
        category: 'science',
        reqs: { science: 4 },
        costs: {
            Lumber: scaleCost(500, 1.36),
            Stone: scaleCost(750, 1.36),
            Crystal: scaleCost(5, 1.36),
        },
        effect: '知识上限 +500，教授上限 +1。',
    },
    // ---- 军事 ----
    {
        id: 'garrison',
        name: '兵营',
        description: '训练和驻扎士兵。',
        category: 'military',
        reqs: { military: 1 },
        costs: {
            Lumber: scaleCost(25, 1.32),
            Stone: scaleCost(18, 1.32),
        },
        effect: '士兵上限 +1。',
    },
    // ---- 制造 ----
    {
        id: 'foundry',
        name: '铸造厂',
        description: '分配工匠制造高级材料。',
        category: 'craft',
        reqs: { foundry: 1 },
        costs: {
            Copper: scaleCost(200, 1.36),
            Stone: scaleCost(100, 1.36),
        },
        effect: '工匠岗位上限 +1。',
    },
];
