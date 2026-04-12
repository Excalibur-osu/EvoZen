/**
 * 版本常量
 *
 * SAVE_VERSION  — 存档格式版本。仅在存档结构发生破坏性变更时手动递增。
 *                 与 npm 包版本（__APP_VERSION__）刻意分离，以便独立控制存档兼容性。
 *
 * __APP_VERSION__ 由 Vite 在构建时从 root package.json 注入，
 *                  在 apps/web 中直接作为全局常量使用。
 */

/** 存档格式版本，破坏性变更时才修改 */
export const SAVE_VERSION = '0.7.0';
