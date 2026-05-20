/**
 * 地狱门系统 (Portal) — 对标 legacy/src/portal.js (9111 行)
 *
 * 包含 8 个区域：
 *   - fortress (要塞)       — 主防御区，warlord 起始区
 *   - badlands (荒原)       — 恶魔入侵第一战线
 *   - wasteland (废土)      — warlord 玩家专用，建造城市
 *   - pit (深渊)            — 灵魂收集
 *   - ruins (遗迹)          — 古代文明遗迹挖掘
 *   - gate (大门)           — 灵魂门，连通 spire
 *   - lake (熔岩湖)         — 双桅船战斗
 *   - spire (尖塔)          — 终局挑战，100 层
 *
 * 本模块提供：
 *   - 所有区域的建筑定义（成本、电力、效果）
 *   - 入侵机制（fortress.threat / patrols）
 *   - 灵魂宝石生产
 *   - Spire 战斗系统骨架
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 区域定义
// ============================================================

export type PortalRegionId = 'fortress' | 'badlands' | 'wasteland' | 'pit' | 'ruins' | 'gate' | 'lake' | 'spire' | 'hellpit';

export interface PortalRegionDef {
  id: PortalRegionId;
  name: string;
  desc: string;
  /** 解锁所需科技等级 */
  reqs: Record<string, number>;
}

export const PORTAL_REGIONS: Record<PortalRegionId, PortalRegionDef> = {
  fortress:  { id: 'fortress',  name: '要塞',     desc: '从世界深处通往地狱的传送门，需要重兵把守。',          reqs: { portal: 2 } },
  badlands:  { id: 'badlands',  name: '荒原',     desc: '恶魔出没的荒野，富含古代圣物。',                      reqs: { portal: 3 } },
  wasteland: { id: 'wasteland', name: '废土',     desc: '战争之主的领土，可在地狱中建立城市。',                reqs: { hell_lake: 4, warlord: 1 } },
  pit:       { id: 'pit',       name: '深渊',     desc: '充满灵魂的地下洞穴，恶魔灵魂之源。',                  reqs: { hell_pit: 1 } },
  ruins:     { id: 'ruins',     name: '遗迹',     desc: '远古文明的废墟，蕴藏神秘技术。',                      reqs: { hell_ruins: 1 } },
  gate:      { id: 'gate',      name: '灵魂门',   desc: '通往尖塔的双塔大门，需要灵魂能量驱动。',              reqs: { hell_gate: 1 } },
  lake:      { id: 'lake',      name: '熔岩湖',   desc: '燃烧的湖面上漂浮着古代战舰。',                        reqs: { hell_lake: 1 } },
  spire:     { id: 'spire',     name: '尖塔',     desc: '通往神界的 100 层挑战塔。',                          reqs: { hell_spire: 1 } },
  hellpit:   { id: 'hellpit',   name: '地狱深坑', desc: '机甲战场，地狱深处的征服挑战。',                      reqs: { hell_pit: 7 } },
};

// ============================================================
// 建筑定义
// ============================================================

export interface PortalBuildingDef {
  /** 建筑 ID（无 prtl_ 前缀） */
  id: string;
  /** 所属区域 */
  region: PortalRegionId;
  name: string;
  desc: string;
  reqs: Record<string, number>;
  /** 不能拥有的 trait（warlord/non-warlord 限制） */
  notTrait?: string[];
  /** 必须拥有的 trait */
  trait?: string[];
  /** 基础成本（rank=1）— 实际成本通过 spaceCostMultiplier 递增计算 */
  baseCost: Record<string, number>;
  /** 成本递增系数 */
  costMult: number;
  /** 电力消耗（MW）— 正值消耗，负值发电 */
  power: number;
  /** 简短效果描述 */
  effectDesc: string;
}

/**
 * 完整 Portal 建筑表（约 60+ 建筑）
 * 对标 legacy portal.js fortressModules 全集
 */
export const PORTAL_BUILDINGS: PortalBuildingDef[] = [
  // ----- Fortress (要塞) -----
  { id: 'turret',       region: 'fortress', name: '炮塔',         desc: '防御性能强大的自动炮塔，需要电力。',           reqs: { portal: 2 }, notTrait: ['warlord'], baseCost: { Money: 350000, Copper: 50000, Adamantite: 8000, Elerium: 15, Nano_Tube: 28000 }, costMult: 1.28, power: 4, effectDesc: '提供 35-70 防御评分（依据 turret 科技升级）。' },
  { id: 'carport',      region: 'fortress', name: '车库',         desc: '为反恶魔战车提供维护与停放。',                 reqs: { portal: 2 }, notTrait: ['warlord'], baseCost: { Money: 250000, Cement: 18000, Oil: 6500, Plywood: 8500 }, costMult: 1.3, power: 0, effectDesc: '雇佣 1 名战车驾驶员。' },
  { id: 'war_droid',    region: 'fortress', name: '战争机器人',   desc: '凶悍的机械战士，每个 +5 战斗评分。',           reqs: { portal: 5 }, notTrait: ['warlord'], baseCost: { Money: 495000, Neutronium: 1250, Elerium: 24, Stanene: 75000, Soul_Gem: 1 }, costMult: 1.3, power: 3, effectDesc: '+5 防御评分，每秒 +1 自动训练进度。' },
  { id: 'repair_droid', region: 'fortress', name: '修复机器人',   desc: '自动修理受损的炮塔、车库和机器人。',           reqs: { portal: 6 }, notTrait: ['warlord'], baseCost: { Money: 612000, Iron: 100000, Adamantite: 12500, Stanene: 100000, Soul_Gem: 2 }, costMult: 1.3, power: 2, effectDesc: '每座修复机器人减少其他建筑维修需求 5%-8%。' },

  // ----- Badlands (荒原) -----
  { id: 'war_drone',    region: 'badlands', name: '战争无人机',   desc: '自主战斗的恶魔猎手。',                         reqs: { portal: 3 }, notTrait: ['warlord'], baseCost: { Money: 750000, Alloy: 35000, Elerium: 35, Stanene: 75000 }, costMult: 1.28, power: 2, effectDesc: '战斗评分 +30。' },
  { id: 'sensor_drone', region: 'badlands', name: '侦察无人机',   desc: '提供战略侦察，提升其他单位效率。',             reqs: { portal: 4 }, notTrait: ['warlord'], baseCost: { Money: 500000, Polymer: 25000, Adamantite: 12500, Quantium: 250 }, costMult: 1.25, power: 1, effectDesc: '工业产出 +1%，战斗评分 +5。' },
  { id: 'attractor',    region: 'badlands', name: '恶魔吸引器',   desc: '将恶魔吸引到战场，提升敌军强度但加速通关。',   reqs: { portal: 4 }, notTrait: ['warlord'], baseCost: { Money: 350000, Aluminium: 175000, Stanene: 90000 }, costMult: 1.25, power: 1, effectDesc: '巡逻队遇敌率 +15%。' },
  { id: 'minions',      region: 'badlands', name: '小鬼仆从',     desc: '战争之主的奴隶恶魔军团。',                     reqs: { portal: 3 }, trait: ['warlord'], baseCost: { Money: 100000, Furs: 4500, Crystal: 4500 }, costMult: 1.25, power: 0, effectDesc: '雇佣 5 名工人。' },
  { id: 'reaper',       region: 'badlands', name: '收割者',       desc: '战争之主的死神，挥舞镰刀收割生命。',           reqs: { portal: 3 }, trait: ['warlord'], baseCost: { Money: 200000, Crystal: 12000, Demonic_Essence: 1 }, costMult: 1.25, power: 0, effectDesc: '提供战斗力，收割灵魂宝石。' },
  { id: 'corpse_pile',  region: 'badlands', name: '尸堆',         desc: '收集战场尸体，提供原材料。',                   reqs: { portal: 3 }, trait: ['warlord'], baseCost: { Money: 150000, Lumber: 50000 }, costMult: 1.2, power: 0, effectDesc: '腐烂产生 +0.5 Demonic_Essence/秒。' },
  { id: 'mortuary',     region: 'badlands', name: '太平间',       desc: '处理尸体，提供金钱与材料。',                   reqs: { portal: 5 }, notTrait: ['warlord'], baseCost: { Money: 850000, Cement: 35000, Brick: 25000, Coal: 7500 }, costMult: 1.28, power: 1, effectDesc: '每死亡 1 人 +250 金钱。' },
  { id: 'codex',        region: 'badlands', name: '法典',         desc: '解锁恶魔知识的禁忌法典。',                     reqs: { portal: 3 }, notTrait: ['warlord'], baseCost: { Money: 425000, Sus: 30, Lumber: 76000, Cement: 22500, Adamantite: 6500 }, costMult: 1.28, power: 0, effectDesc: '增加魔法领域科技解锁机率。' },

  // ----- Wasteland (废土) — warlord 专用 -----
  { id: 'throne',         region: 'wasteland', name: '王座',         desc: '战争之主的统治中心。',                     reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Money: 50000000, Demonic_Essence: 100, Soul_Gem: 100 }, costMult: 1.1, power: 0, effectDesc: '解锁地狱城市建造。' },
  { id: 'incinerator',    region: 'wasteland', name: '焚化炉',       desc: '焚化尸体提供能量。',                       reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 10, Soul_Gem: 10 }, costMult: 1.2, power: -8, effectDesc: '发电 8 MW。' },
  { id: 'warehouse',      region: 'wasteland', name: '地狱仓库',     desc: '地狱中的资源储存设施。',                   reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 5, Adamantite: 1000 }, costMult: 1.2, power: 1, effectDesc: '增加多种资源容量。' },
  { id: 'hovel',          region: 'wasteland', name: '陋屋',         desc: '为地狱居民提供住所。',                     reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 3, Stone: 50000 }, costMult: 1.2, power: 0, effectDesc: '住房 +3。' },
  { id: 'hell_casino',    region: 'wasteland', name: '地狱赌场',     desc: '为恶魔市民提供娱乐。',                     reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 20, Soul_Gem: 25 }, costMult: 1.2, power: 4, effectDesc: '提供金钱与士气加成。' },
  { id: 'twisted_lab',    region: 'wasteland', name: '扭曲实验室',   desc: '研究恶魔生理的禁忌实验室。',               reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 15, Sus: 75 }, costMult: 1.2, power: 6, effectDesc: '提供 Sus 知识产出。' },
  { id: 'demon_forge',    region: 'wasteland', name: '恶魔铸造厂',   desc: '锻造恶魔兵器的工坊。',                     reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 25, Iron: 100000 }, costMult: 1.2, power: 3, effectDesc: '武器升级加成。' },
  { id: 'hell_factory',   region: 'wasteland', name: '地狱工厂',     desc: '大规模生产地狱产品。',                     reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 30, Stanene: 50000 }, costMult: 1.2, power: 4, effectDesc: '工厂产出 +50%。' },
  { id: 'pumpjack',       region: 'wasteland', name: '地狱抽油机',   desc: '从地下抽取地狱原油。',                     reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 20, Iron: 80000 }, costMult: 1.2, power: 3, effectDesc: '+5 Oil/秒。' },
  { id: 'dig_demon',      region: 'wasteland', name: '挖掘恶魔',     desc: '指挥恶魔在地狱深处采矿。',                 reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 10, Soul_Gem: 8 }, costMult: 1.2, power: 0, effectDesc: '提供采矿任务。' },
  { id: 'tunneler',       region: 'wasteland', name: '隧道机',       desc: '挖掘隧道，连接地狱区域。',                 reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 15, Adamantite: 5000 }, costMult: 1.2, power: 2, effectDesc: '解锁地下通道。' },
  { id: 'brute',          region: 'wasteland', name: '战兽',         desc: '征服敌方城邦的恶魔野兽。',                 reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 50, Soul_Gem: 50 }, costMult: 1.2, power: 0, effectDesc: '提供大量战斗力。' },
  { id: 'wonder_gardens', region: 'wasteland', name: '奇景花园',     desc: '战争之主的奇景。',                         reqs: { hell_lake: 4, warlord: 1 }, trait: ['warlord'], baseCost: { Demonic_Essence: 1000, Soul_Gem: 1000 }, costMult: 1.0, power: 0, effectDesc: '士气 +25。' },

  // ----- Pit (深渊) -----
  { id: 'pit_mission',       region: 'pit', name: '深渊远征',     desc: '派遣远征队探索深渊。',                       reqs: { hell_pit: 1 }, baseCost: { Knowledge: 250000 }, costMult: 1.0, power: 0, effectDesc: '解锁深渊建筑。' },
  { id: 'assault_forge',     region: 'pit', name: '突击铸造厂',   desc: '锻造突击兵器。',                             reqs: { hell_pit: 4 }, baseCost: { Money: 80000000, Adamantite: 1500000, Bolognium: 250000, Stanene: 1250000 }, costMult: 1.22, power: 10, effectDesc: '提升突击战力。' },
  { id: 'soul_forge',        region: 'pit', name: '灵魂熔炉',     desc: '熔铸灵魂为宝石。',                           reqs: { hell_pit: 5 }, baseCost: { Money: 50000000, Coal: 1250000, Iridium: 425000, Mythril: 100000, Demonic_Essence: 1 }, costMult: 1.18, power: 12, effectDesc: '生产 Soul Gem。' },
  { id: 'gun_emplacement',   region: 'pit', name: '炮位',         desc: '防御性炮台。',                               reqs: { hell_pit: 5 }, baseCost: { Money: 80000000, Coal: 750000, Steel: 1250000 }, costMult: 1.25, power: 3, effectDesc: '提供防御。' },
  { id: 'soul_attractor',    region: 'pit', name: '灵魂吸引器',   desc: '增加灵魂宝石掉率。',                         reqs: { hell_pit: 8 }, baseCost: { Money: 1000000, Crystal: 200000, Aerogel: 25000 }, costMult: 1.22, power: 4, effectDesc: '增加灵魂掉率 15%。' },
  { id: 'soul_capacitor',    region: 'pit', name: '灵魂电容器',   desc: '储存灵魂能量。',                             reqs: { hell_pit: 9 }, baseCost: { Money: 800000000, Soul_Gem: 1000 }, costMult: 1.25, power: 12, effectDesc: '储存灵魂能量供其他建筑使用。' },
  { id: 'absorption_chamber', region: 'pit', name: '吸收室',      desc: '吸收灵魂能量。',                             reqs: { hell_pit: 9 }, baseCost: { Money: 2000000000, Mythril: 5000000, Aerogel: 1000000 }, costMult: 1.25, power: 25, effectDesc: '将灵魂转化为其他形式能量。' },
  { id: 'shadow_mine',       region: 'pit', name: '影矿',         desc: '在阴影中采集稀有矿物。',                     reqs: { hell_pit: 6 }, baseCost: { Money: 12000000, Asphodel_Powder: 250 }, costMult: 1.18, power: 5, effectDesc: '产出 Asphodel Powder。' },
  { id: 'tavern',            region: 'pit', name: '酒馆',         desc: '冒险者聚集之地。',                           reqs: { hell_pit: 1 }, baseCost: { Money: 1750000, Furs: 95000, Steel: 25000 }, costMult: 1.2, power: 0, effectDesc: '士气 +5。' },

  // ----- Ruins (遗迹) -----
  { id: 'ruins_mission',  region: 'ruins', name: '遗迹远征',     desc: '探索远古遗迹。',                             reqs: { hell_ruins: 1 }, baseCost: { Knowledge: 500000 }, costMult: 1.0, power: 0, effectDesc: '解锁遗迹建筑。' },
  { id: 'guard_post',     region: 'ruins', name: '守卫站',       desc: '保护考古队的安全。',                         reqs: { hell_ruins: 2 }, baseCost: { Money: 8000000, Lumber: 750000, Stone: 750000, Furs: 380000, Crystal: 75000 }, costMult: 1.22, power: 3, effectDesc: '雇佣 5 名守卫。' },
  { id: 'vault',          region: 'ruins', name: '保险库',       desc: '存储远古宝藏。',                             reqs: { hell_ruins: 1 }, baseCost: { Money: 7500000, Steel: 175000 }, costMult: 1.25, power: 1, effectDesc: '+25M Money 容量。' },
  { id: 'war_vault',      region: 'ruins', name: '战争保险库',   desc: '存储战争物资。',                             reqs: { hell_ruins: 1 }, trait: ['warlord'], baseCost: { Money: 9500000, Steel: 250000 }, costMult: 1.25, power: 1, effectDesc: '+30M Money 容量。' },
  { id: 'archaeology',    region: 'ruins', name: '考古发掘',     desc: '挖掘远古文物。',                             reqs: { hell_ruins: 3 }, baseCost: { Money: 25000000, Lumber: 1250000, Stone: 1250000, Mythril: 12500 }, costMult: 1.22, power: 0, effectDesc: '生产 Codex。' },
  { id: 'arcology',       region: 'ruins', name: '巨型生态屋',   desc: '在遗迹中建立庞大居住区。',                   reqs: { hell_ruins: 6 }, baseCost: { Money: 75000000, Cement: 1500000, Steel: 750000, Adamantite: 100000 }, costMult: 1.25, power: 25, effectDesc: '+250 住房，提供大量市民。' },
  { id: 'hell_forge',     region: 'ruins', name: '地狱铸造厂',   desc: '冶炼超级金属。',                             reqs: { hell_ruins: 4 }, baseCost: { Money: 12000000, Adamantite: 200000, Bolognium: 80000 }, costMult: 1.25, power: 4, effectDesc: '提供工匠岗位与工业产出。' },
  { id: 'inferno_power',  region: 'ruins', name: '熔狱发电',     desc: '利用地狱熔岩发电。',                         reqs: { hell_ruins: 5 }, baseCost: { Money: 25000000, Brick: 350000, Coal: 250000, Infernite: 1000 }, costMult: 1.2, power: -22, effectDesc: '产生 22 MW 电力。' },
  { id: 'ancient_pillars', region: 'ruins', name: '远古石柱',    desc: '远古文明的支柱，调谐后增益。',               reqs: { hell_ruins: 6 }, baseCost: { Harmony: 1 }, costMult: 1.05, power: 0, effectDesc: '调谐石柱：每柱提供全球加成。' },

  // ----- Gate (灵魂门) -----
  { id: 'gate_mission',  region: 'gate', name: '门探索',       desc: '探索灵魂门。',                               reqs: { hell_gate: 1 }, baseCost: { Knowledge: 750000 }, costMult: 1.0, power: 0, effectDesc: '解锁灵魂门建筑。' },
  { id: 'west_tower',    region: 'gate', name: '西塔',         desc: '灵魂门的西侧塔楼。',                         reqs: { hell_gate: 2 }, baseCost: { Money: 25000000, Stone: 1250000, Adamantite: 175000, Soul_Gem: 5 }, costMult: 1.0, power: 8, effectDesc: '驱动灵魂门西侧。' },
  { id: 'east_tower',    region: 'gate', name: '东塔',         desc: '灵魂门的东侧塔楼。',                         reqs: { hell_gate: 2 }, baseCost: { Money: 25000000, Stone: 1250000, Adamantite: 175000, Soul_Gem: 5 }, costMult: 1.0, power: 8, effectDesc: '驱动灵魂门东侧。' },
  { id: 'gate_turret',   region: 'gate', name: '门炮塔',       desc: '保卫灵魂门的高级炮塔。',                     reqs: { hell_gate: 3 }, baseCost: { Money: 350000, Mythril: 80000, Iridium: 25000, Soul_Gem: 1 }, costMult: 1.22, power: 4, effectDesc: '提供战斗评分 100。' },
  { id: 'infernite_mine', region: 'gate', name: '炼狱矿',      desc: '开采炼狱矿石。',                             reqs: { hell_gate: 4 }, baseCost: { Money: 80000000, Adamantite: 250000, Stanene: 750000 }, costMult: 1.22, power: 5, effectDesc: '产出 Infernite。' },

  // ----- Lake (熔岩湖) -----
  { id: 'lake_mission',   region: 'lake', name: '湖泊探索',     desc: '探索熔岩湖。',                               reqs: { hell_lake: 1 }, baseCost: { Knowledge: 600000 }, costMult: 1.0, power: 0, effectDesc: '解锁湖泊建筑。' },
  { id: 'harbor',         region: 'lake', name: '港口',         desc: '熔岩湖港口，供应战舰。',                     reqs: { hell_lake: 2 }, baseCost: { Money: 18000000, Cement: 500000, Steel: 400000, Stanene: 250000 }, costMult: 1.2, power: 6, effectDesc: '提供战舰维护设施。' },
  { id: 'cooling_tower',  region: 'lake', name: '冷却塔',       desc: '降低熔岩湖温度。',                           reqs: { hell_lake: 3 }, baseCost: { Money: 14000000, Cement: 350000, Aerogel: 80000 }, costMult: 1.18, power: 4, effectDesc: '为湖区降温。' },
  { id: 'bireme',         region: 'lake', name: '双桅战船',     desc: '熔岩湖战船，作战与运输。',                   reqs: { hell_lake: 3 }, baseCost: { Money: 18000000, Iron: 380000, Aluminium: 220000, Aerogel: 6500, Soul_Gem: 1 }, costMult: 1.2, power: 0, effectDesc: '+1 战斗评分。' },
  { id: 'transport',      region: 'lake', name: '运输船',       desc: '运输部队穿越熔岩湖。',                       reqs: { hell_lake: 3 }, baseCost: { Money: 12000000, Iron: 200000, Steel: 350000, Aluminium: 175000 }, costMult: 1.2, power: 0, effectDesc: '运送 2 名士兵。' },
  { id: 'oven',           region: 'lake', name: '魔法烤箱',     desc: '熔岩湖的神秘烹饪装置。',                     reqs: { hell_lake: 5 }, baseCost: { Money: 50000000, Iridium: 250000, Aerogel: 100000 }, costMult: 1.0, power: 0, effectDesc: '蓄能进度。' },

  // ----- Spire (尖塔) -----
  { id: 'spire_mission',  region: 'spire', name: '尖塔远征',     desc: '攀登尖塔。',                                 reqs: { hell_spire: 1 }, baseCost: { Knowledge: 1500000 }, costMult: 1.0, power: 0, effectDesc: '解锁尖塔建筑。' },
  { id: 'purifier',       region: 'spire', name: '净化器',       desc: '净化尖塔的腐化能量。',                       reqs: { hell_spire: 2 }, baseCost: { Money: 80000000, Iridium: 850000, Aerogel: 350000, Vitreloy: 12000 }, costMult: 1.22, power: 18, effectDesc: '净化进度 +1。' },
  { id: 'port',           region: 'spire', name: '尖塔港口',     desc: '尖塔基地的物资中转站。',                     reqs: { hell_spire: 2 }, baseCost: { Money: 95000000, Steel: 750000, Polymer: 1250000, Bolognium: 65000 }, costMult: 1.22, power: 4, effectDesc: '+1.25M Money 容量。' },
  { id: 'base_camp',      region: 'spire', name: '大本营',       desc: '尖塔脚下的远征队基地。',                     reqs: { hell_spire: 3 }, baseCost: { Money: 85000000, Cement: 500000, Furs: 750000, Polymer: 875000 }, costMult: 1.22, power: 4, effectDesc: '增加远征队规模。' },
  { id: 'bridge',         region: 'spire', name: '桥梁',         desc: '连接尖塔层之间的通道。',                     reqs: { hell_spire: 4 }, baseCost: { Money: 75000000, Steel: 1750000, Stanene: 1250000, Soul_Gem: 50 }, costMult: 1.2, power: 0, effectDesc: '+1 层挑战进度。' },
  { id: 'sphinx',         region: 'spire', name: '狮身人面像',   desc: '尖塔的守门者。',                             reqs: { hell_spire: 6 }, baseCost: { Money: 250000000, Stone: 4500000, Brick: 1100000, Aerogel: 250000 }, costMult: 1.0, power: 0, effectDesc: '解谜或贿赂。' },
  { id: 'mechbay',        region: 'spire', name: '机甲库',       desc: '建造和维护战斗机甲。',                       reqs: { hell_spire: 4 }, baseCost: { Money: 12000000, Steel: 750000, Adamantite: 75000, Soul_Gem: 12 }, costMult: 1.22, power: 5, effectDesc: '提供机甲建造空间。' },
  { id: 'spire',          region: 'spire', name: '尖塔登顶',     desc: '征服尖塔的下一层。',                         reqs: { hell_spire: 5 }, baseCost: { Money: 30000000, Soul_Gem: 1 }, costMult: 1.25, power: 0, effectDesc: '推进尖塔进度。' },
  { id: 'waygate',        region: 'spire', name: '路标门',       desc: '通往神界的传送门。',                         reqs: { waygate: 1 }, baseCost: { Money: 250000000, Soul_Gem: 500, Demonic_Essence: 100 }, costMult: 1.1, power: 0, effectDesc: '解锁飞升路径。' },
  { id: 'edenic_gate',    region: 'spire', name: '伊甸门',       desc: '通往伊甸园的传送门（终局）。',               reqs: { edenic_gate: 1 }, baseCost: { Demonic_Essence: 1000, Harmony: 1, Asphodel_Powder: 5000 }, costMult: 1.0, power: 0, effectDesc: '解锁 Edenic 模式。' },
];

// ============================================================
// 入侵机制 — 对标 legacy portal.js fortressTick
// ============================================================

export interface FortressState {
  /** 巡逻队数量 */
  patrols: number;
  /** 每巡逻队大小 */
  patrol_size: number;
  /** 当前威胁等级（恶魔涌入累积值） */
  threat: number;
  /** 当前已部署巡逻队（活动数） */
  garrison: number;
  /** 最大兵力 */
  walls: number;
  /** 最大兵力上限（要塞墙体血量） */
  max_walls: number;
  /** 最大威胁衰减率 */
  notify: string;
}

export function defaultFortressState(): FortressState {
  return {
    patrols: 0,
    patrol_size: 10,
    threat: 1000,
    garrison: 0,
    walls: 100,
    max_walls: 100,
    notify: 'Yes',
  };
}

/**
 * Portal 建筑产出 tick — 对标 legacy/src/portal.js 各建筑 productionFn
 * 在主 tick.ts 中 fortressTick 之前调用
 */
export function portalProductionTick(state: GameState, timeMul: number, deltas: Record<string, number>): void {
  if ((state.tech['portal'] ?? 0) < 2) return;
  const portal = state.portal as Record<string, Record<string, number>>;

  // ----- Pit / Soul Gem 产出 -----
  // soul_forge：每个通电 +1 Soul Gem/分钟（简化），受 soul_attractor 加成
  const forgeOn = portal['soul_forge']?.['on'] ?? 0;
  if (forgeOn > 0) {
    const attractorOn = portal['soul_attractor']?.['on'] ?? 0;
    const rate = forgeOn * (1 + attractorOn * 0.15) / 60 * timeMul;
    deltas['Soul_Gem'] = (deltas['Soul_Gem'] ?? 0) + rate;
  }

  // ----- Pit / shadow_mine 产出 Asphodel Powder -----
  const shadowOn = portal['shadow_mine']?.['on'] ?? 0;
  if (shadowOn > 0) {
    deltas['Asphodel_Powder'] = (deltas['Asphodel_Powder'] ?? 0) + shadowOn * 2 * timeMul;
  }

  // ----- Ruins / archaeology 产出 Codex (Sus 资源) -----
  const archOn = portal['archaeology']?.['on'] ?? 0;
  if (archOn > 0) {
    deltas['Codex'] = (deltas['Codex'] ?? 0) + archOn * 0.025 * timeMul;
  }

  // ----- Ruins / inferno_power 已在 power.ts 处理发电 -----

  // ----- Gate / infernite_mine 产出 Infernite -----
  const infOn = portal['infernite_mine']?.['on'] ?? 0;
  if (infOn > 0) {
    deltas['Infernite'] = (deltas['Infernite'] ?? 0) + infOn * 0.5 * timeMul;
  }

  // ----- Wasteland / pumpjack 产出 Oil（地狱原油，warlord）-----
  const pumpOn = portal['pumpjack']?.['on'] ?? 0;
  if (pumpOn > 0) {
    deltas['Oil'] = (deltas['Oil'] ?? 0) + pumpOn * 5 * timeMul;
  }

  // ----- Wasteland / incinerator 已在 power.ts 处理发电 -----

  // ----- Wasteland / corpse_pile 产出 Demonic Essence (warlord) -----
  const cpileCount = portal['corpse_pile']?.['count'] ?? 0;
  if (cpileCount > 0 && state.race['warlord']) {
    deltas['Demonic_Essence'] = (deltas['Demonic_Essence'] ?? 0) + cpileCount * 0.5 * timeMul;
  }

  // ----- Wasteland / mortuary 产出 Money（每死亡 +250 / Total stat） -----
  const mortOn = portal['mortuary']?.['on'] ?? 0;
  if (mortOn > 0) {
    deltas['Money'] = (deltas['Money'] ?? 0) + mortOn * 100 * timeMul;
  }

  // ----- Spire / port 增加 Money 容量 -----
  // 容量在 derived-state 处理；此处略

  // ----- Spire / spire（每层 +0.5 Harmony 进度，缓慢叠加）-----
  // 实际登顶通过 ascendSpire 触发，这里不消耗

  // ----- Lake / harbor / bireme / transport：用于运输部队/资源（中前期无主动产出）-----
}

/**
 * 要塞 tick：
 *   1. 威胁随机增减
 *   2. 巡逻队与恶魔遭遇战
 *   3. 城墙修复（repair_droid）
 */
export function fortressTick(state: GameState, timeMul: number = 1): void {
  const portal = state.portal as Record<string, Record<string, number>>;
  if (!portal['fortress']) {
    portal['fortress'] = defaultFortressState() as unknown as Record<string, number>;
  }
  const fort = portal['fortress'];

  // 1. 威胁增长（每 tick 随机 + 受 attractor 影响）
  const attractors = (portal['attractor']?.['count'] ?? 0) * (portal['attractor']?.['on'] ?? 1);
  const threatIncrement = (Math.floor(Math.random() * 4) + 1) * timeMul + attractors * 0.5;
  fort['threat'] = (fort['threat'] ?? 1000) + threatIncrement;

  // 威胁上限：基础 10000，每 corpse_pile 区域威胁衰减
  const threatCap = 10000;
  if (fort['threat'] > threatCap) fort['threat'] = threatCap;

  // 2. 巡逻队与恶魔战斗（简化）
  const turrets = (portal['turret']?.['on'] ?? 0);
  const droids = (portal['war_droid']?.['on'] ?? 0);
  const defenseRating = turrets * 50 + droids * 5;

  // 当威胁 > 防御 × 阈值时损失城墙
  const wallDamageThreshold = defenseRating * 10 + 1000;
  if (fort['threat'] > wallDamageThreshold) {
    const damage = Math.floor((fort['threat'] - wallDamageThreshold) / 200) * timeMul;
    fort['walls'] = Math.max(0, (fort['walls'] ?? 100) - damage);
  }

  // 3. 城墙修复
  const repairDroids = portal['repair_droid']?.['on'] ?? 0;
  if (repairDroids > 0 && (fort['walls'] ?? 0) < (fort['max_walls'] ?? 100)) {
    const repair = repairDroids * 0.5 * timeMul;
    fort['walls'] = Math.min(fort['max_walls'] ?? 100, (fort['walls'] ?? 0) + repair);
  }
}

// ============================================================
// 灵魂宝石生产 — 对标 legacy portal.js soul_forge
// ============================================================

/**
 * 计算 Soul Gem 当前生产进度（仅当 Pit 探索完成且 soul_forge 通电）
 */
export function calcSoulGemProgress(state: GameState): number {
  const portal = state.portal as Record<string, Record<string, number>>;
  const forge = portal['soul_forge'];
  if (!forge?.['on']) return 0;

  // 每个 soul_forge 每秒 +1 进度，受 soul_attractor 加成
  const baseRate = forge['on'];
  const attractors = portal['soul_attractor']?.['on'] ?? 0;
  const bonus = 1 + attractors * 0.15;
  return baseRate * bonus;
}

// ============================================================
// 尖塔登顶 — 对标 legacy portal.js spire mechanic
// ============================================================

export interface SpireState {
  /** 当前层数（0-100）*/
  level: number;
  /** 当前层进度 */
  progress: number;
  /** 当前层奖励池 */
  reward: string;
}

export function defaultSpireState(): SpireState {
  return { level: 0, progress: 0, reward: 'none' };
}

/** 推进尖塔一层（消耗大量资源） */
export function ascendSpire(state: GameState): boolean {
  const portal = state.portal as Record<string, Record<string, number>>;
  const spire = portal['spire'] as unknown as SpireState | undefined;
  if (!spire) {
    portal['spire'] = defaultSpireState() as unknown as Record<string, number>;
    return false;
  }
  if ((spire.level ?? 0) >= 100) return false;

  const cost = 30_000_000 * Math.pow(1.25, spire.level ?? 0);
  const money = state.resource['Money'];
  if (!money || money.amount < cost) return false;
  const soulGem = state.resource['Soul_Gem'];
  if (!soulGem || soulGem.amount < 1) return false;

  money.amount -= cost;
  soulGem.amount -= 1;
  (portal['spire'] as unknown as SpireState).level = (spire.level ?? 0) + 1;
  return true;
}

// ============================================================
// 工具函数
// ============================================================

/** 获取某区域所有建筑 */
export function getBuildingsByRegion(region: PortalRegionId): PortalBuildingDef[] {
  return PORTAL_BUILDINGS.filter((b) => b.region === region);
}

/** 判断某区域是否已解锁 */
export function isRegionUnlocked(state: GameState, regionId: PortalRegionId): boolean {
  const def = PORTAL_REGIONS[regionId];
  for (const [tech, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  return true;
}

/** 判断某建筑是否可见（科技 + trait 限制） */
export function isBuildingVisible(state: GameState, building: PortalBuildingDef): boolean {
  // 科技要求
  for (const [tech, lvl] of Object.entries(building.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  // notTrait 检查
  if (building.notTrait) {
    for (const trait of building.notTrait) {
      if (state.race[trait]) return false;
    }
  }
  // trait 必需
  if (building.trait) {
    for (const trait of building.trait) {
      if (!state.race[trait]) return false;
    }
  }
  return true;
}

/** 计算成本（含递增系数） */
export function getPortalBuildCost(state: GameState, buildingId: string): Record<string, number> | null {
  const building = PORTAL_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return null;
  const portal = state.portal as Record<string, Record<string, number>>;
  const count = portal[buildingId]?.['count'] ?? 0;
  const mult = Math.pow(building.costMult, count);
  const cost: Record<string, number> = {};
  for (const [res, base] of Object.entries(building.baseCost)) {
    cost[res] = Math.round(base * mult);
  }
  return cost;
}

/** 判断是否可建造 */
export function canBuildPortalStructure(state: GameState, buildingId: string): boolean {
  const building = PORTAL_BUILDINGS.find((b) => b.id === buildingId);
  if (!building || !isBuildingVisible(state, building)) return false;
  const cost = getPortalBuildCost(state, buildingId);
  if (!cost) return false;
  for (const [res, amount] of Object.entries(cost)) {
    if ((state.resource[res]?.amount ?? 0) < amount) return false;
  }
  return true;
}

/** 建造一座 Portal 建筑 */
export function buildPortalStructure(state: GameState, buildingId: string): boolean {
  if (!canBuildPortalStructure(state, buildingId)) return false;
  const cost = getPortalBuildCost(state, buildingId)!;
  for (const [res, amount] of Object.entries(cost)) {
    if (state.resource[res]) state.resource[res].amount -= amount;
  }
  const portal = state.portal as Record<string, Record<string, number>>;
  if (!portal[buildingId]) portal[buildingId] = { count: 0, on: 0 };
  portal[buildingId].count = (portal[buildingId].count ?? 0) + 1;
  return true;
}

// ============================================================
// Ancient Pillar 调谐机制
// 对标 legacy/src/portal.js calcPillar()
// 用 Harmony 激活每根柱子，激活后柱子提供 +5%/级 全球产出
// ============================================================

/** 调谐一根柱子（消耗 1 Harmony）*/
export function tunePillar(state: GameState): boolean {
  const portal = state.portal as Record<string, Record<string, number>>;
  const pillars = portal['ancient_pillars']?.['count'] ?? 0;
  const tuned = portal['ancient_pillars']?.['tuned'] ?? 0;
  if (tuned >= pillars) return false;

  const prestige = state.prestige as Record<string, { count?: number }>;
  const harmony = prestige?.['Harmony']?.count ?? 0;
  if (harmony < 1) return false;

  prestige['Harmony']!.count = harmony - 1;
  portal['ancient_pillars']!['tuned'] = tuned + 1;
  return true;
}

/** 获取已调谐的柱子数 */
export function getTunedPillarCount(state: GameState): number {
  const portal = state.portal as Record<string, Record<string, number>>;
  return portal['ancient_pillars']?.['tuned'] ?? 0;
}

/** 柱子提供的全球加成乘数（每柱 +5%） */
export function getPillarBonus(state: GameState): number {
  return 1 + getTunedPillarCount(state) * 0.05;
}
