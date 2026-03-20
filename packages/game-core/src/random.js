/**
 * 种子随机数生成器
 * 从旧 src/vars.js 提取，去除全局副作用
 */
/**
 * 线性同余伪随机数生成器
 * 原算法: seed = (seed * 9301 + 49297) % 233280
 */
export function seededRandom(min = 0, max = 1, seed) {
    const newSeed = (seed * 9301 + 49297) % 233280;
    const rnd = newSeed / 233280;
    return {
        value: min + rnd * (max - min),
        nextSeed: newSeed,
    };
}
/** Math.rand 替代（无全局副作用） */
export function mathRand(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
