/**
 * 游戏状态初始化
 * 从旧 src/vars.js 提取核心新游戏数据结构
 */
/** 默认设置 */
export function defaultSettings() {
    return {
        theme: 'dark',
        locale: 'zh-CN',
        affix: 'si',
        icon: 'star',
        font: 'standard',
        civTabs: 1,
        spaceTabs: 0,
        govTabs: 0,
        resTabs: 0,
        statsTabs: 0,
        marketTabs: 0,
        animated: true,
        tabLoad: false,
        pause: false,
        showEvolution: true,
        showCity: false,
        showCivic: false,
        showResources: false,
        showMarket: false,
        showStorage: false,
        showIndustry: false,
        showPowerGrid: false,
        showMil: false,
        q_merge: 'merge_nearby',
        queuestyle: 'standardqueuestyle',
        q_resize: 'q_resize_auto',
    };
}
/** 创建默认资源状态 */
function makeResource(name, max, rate, display = false) {
    return {
        name,
        display,
        value: 0,
        amount: 0,
        max,
        rate,
        crates: 0,
        containers: 0,
        diff: 0,
        delta: 0,
    };
}
/** 创建默认岗位状态 */
function makeJob(job, impact, stress, display = false) {
    return {
        job,
        display,
        workers: 0,
        max: 0,
        impact,
        assigned: 0,
        stress,
        name: job,
    };
}
/** 创建默认日历 */
function makeCalendar() {
    return {
        day: 0,
        year: 0,
        season: 0,
        weather: 2,
        temp: 1,
        moon: 0,
        wind: 0,
        orbit: 365,
    };
}
/** 创建全新的游戏状态 */
export function createNewGame() {
    const state = {
        seed: 2,
        warseed: 2,
        version: '0.1.0',
        resource: {
            // 进化阶段
            RNA: makeResource('RNA', 100, 1, true),
            DNA: makeResource('DNA', 100, 1, true),
            // 基础资源
            Money: { ...makeResource('金币', 1000, 1), value: 0 },
            Food: { ...makeResource('食物', 250, 1), value: 5 },
            Lumber: { ...makeResource('木材', 200, 1), value: 5 },
            Stone: { ...makeResource('石头', 200, 1), value: 5 },
            Furs: { ...makeResource('毛皮', 100, 1), value: 8 },
            Copper: { ...makeResource('铜', 100, 1), value: 25 },
            Iron: { ...makeResource('铁', 100, 1), value: 40 },
            Cement: { ...makeResource('水泥', 100, 1), value: 15 },
            Coal: { ...makeResource('煤', 50, 1), value: 20 },
            Knowledge: { ...makeResource('知识', 100, 1), value: 0 },
            Steel: { ...makeResource('钢', 50, 1), value: 100 },
            // 合成资源
            Plywood: { ...makeResource('胶合板', -1, 0), value: 0 },
            Brick: { ...makeResource('砖', -1, 0), value: 0 },
            Wrought_Iron: { ...makeResource('锻铁', -1, 0), value: 0 },
            // 容器
            Crates: { ...makeResource('板条箱', 0, 0) },
            Containers: { ...makeResource('集装箱', 0, 0) },
        },
        evolution: {},
        tech: {},
        city: {
            calendar: makeCalendar(),
            biome: 'grassland',
            ptrait: 'none',
            geology: {},
            market: { active: false },
        },
        space: {},
        interstellar: {},
        portal: {},
        eden: {},
        tauceti: {},
        civic: {
            taxes: { tax_rate: 20 },
            govern: { type: 'anarchy', rev: 0, fr: 0 },
            foreign: {
                gov0: makeForeignGov(),
                gov1: makeForeignGov(),
                gov2: makeForeignGov(),
            },
            d_job: 'unemployed',
            // 基础岗位
            unemployed: makeJob('unemployed', 0, 0),
            hunter: makeJob('hunter', 0, 0),
            farmer: makeJob('farmer', 0.82, 5),
            lumberjack: makeJob('lumberjack', 1, 5),
            quarry_worker: makeJob('quarry_worker', 1, 5),
            miner: makeJob('miner', 1, 4),
            coal_miner: makeJob('coal_miner', 0.2, 4),
            craftsman: makeJob('craftsman', 1, 5),
            cement_worker: makeJob('cement_worker', 0.4, 5),
            banker: makeJob('banker', 0.1, 6),
            entertainer: makeJob('entertainer', 1, 10),
            professor: makeJob('professor', 0.5, 6),
            scientist: makeJob('scientist', 1, 5),
            priest: makeJob('priest', 1, 3),
        },
        race: {
            species: 'protoplasm',
            gods: 'none',
        },
        genes: {},
        blood: {},
        stats: {
            start: Date.now(),
            days: 0,
            tdays: 0,
        },
        settings: defaultSettings(),
        event: { t: 200, l: false },
        m_event: { t: 499, l: false },
        queue: {
            display: false,
            queue: [],
        },
        r_queue: {
            display: false,
            queue: [],
        },
        prestige: {
            Plasmid: { count: 0 },
        },
    };
    return state;
}
function makeForeignGov() {
    return {
        unrest: 0,
        hstl: 10,
        mil: 0,
        eco: 0,
        spy: 0,
        esp: 0,
        trn: 0,
        sab: 0,
        act: 'none',
        occ: false,
        anx: false,
        buy: false,
    };
}
