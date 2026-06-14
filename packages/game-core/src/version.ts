/**
 * 版本常量
 *
 * SAVE_VERSION  — 存档版本。由 scripts/sync-version.mjs 与 npm 包版本同步。
 *
 * __APP_VERSION__ 由 Vite 在构建时从 root package.json 注入，
 *                  在 apps/web 中直接作为全局常量使用。
 */

/** 存档版本，由 scripts/sync-version.mjs 维护 */
export const SAVE_VERSION = '0.9.3';
