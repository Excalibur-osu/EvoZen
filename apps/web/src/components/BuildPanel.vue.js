import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { BASIC_STRUCTURES } from '@evozen/game-core';
import { getResourceName } from '../utils/resourceNames';
const game = useGameStore();
/** 可见建筑：前置科技已满足 */
const availableBuildings = computed(() => {
    return BASIC_STRUCTURES.filter(def => {
        for (const [techId, lvl] of Object.entries(def.reqs)) {
            if ((game.state.tech[techId] ?? 0) < lvl)
                return false;
        }
        return true;
    });
});
/** 手动采集按钮配置 */
const gatherActions = computed(() => {
    const actions = [
        { resId: 'Food', label: '搜集食物', icon: '🍖', visible: true },
        { resId: 'Lumber', label: '捡拾木材', icon: '🪵', visible: true },
    ];
    // 有了骨制工具后可以搜集石头
    if ((game.state.tech['primitive'] ?? 0) >= 2) {
        actions.push({ resId: 'Stone', label: '采集石头', icon: '🪨', visible: true });
    }
    return actions.filter(a => a.visible);
});
function getCount(id) {
    return game.state.city[id]?.count ?? 0;
}
function formatCost(structureId) {
    const costs = game.getBuildCost(structureId);
    return Object.entries(costs).map(([resId, amount]) => ({
        resId,
        amount: Math.ceil(amount),
        affordable: (game.state.resource[resId]?.amount ?? 0) >= amount,
    }));
}
function isStorageFull(resId) {
    const res = game.state.resource[resId];
    if (!res)
        return false;
    return res.max > 0 && res.amount >= res.max;
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['gather-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gather-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['gather-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['build-item']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['build-item']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['build-item']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-tag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "build-panel" },
});
/** @type {__VLS_StyleScopedClasses['build-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "gather-section" },
});
/** @type {__VLS_StyleScopedClasses['gather-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "section-title" },
});
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "gather-grid" },
});
/** @type {__VLS_StyleScopedClasses['gather-grid']} */ ;
for (const [action] of __VLS_vFor((__VLS_ctx.gatherActions))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.game.gather(action.resId);
                // @ts-ignore
                [gatherActions, game,];
            } },
        key: (action.resId),
        ...{ class: "gather-btn" },
        ...{ class: ({ disabled: __VLS_ctx.isStorageFull(action.resId) }) },
        disabled: (__VLS_ctx.isStorageFull(action.resId)),
    });
    /** @type {__VLS_StyleScopedClasses['gather-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['disabled']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "gather-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['gather-icon']} */ ;
    (action.icon);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "gather-label" },
    });
    /** @type {__VLS_StyleScopedClasses['gather-label']} */ ;
    (action.label);
    // @ts-ignore
    [isStorageFull, isStorageFull,];
}
if (__VLS_ctx.availableBuildings.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "build-list" },
    });
    /** @type {__VLS_StyleScopedClasses['build-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "section-title" },
    });
    /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
    for (const [def] of __VLS_vFor((__VLS_ctx.availableBuildings))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.availableBuildings.length > 0))
                        return;
                    __VLS_ctx.game.build(def.id);
                    // @ts-ignore
                    [game, availableBuildings, availableBuildings,];
                } },
            key: (def.id),
            ...{ class: "build-item" },
            ...{ class: ({ disabled: !__VLS_ctx.game.canAfford(def.id) }) },
        });
        /** @type {__VLS_StyleScopedClasses['build-item']} */ ;
        /** @type {__VLS_StyleScopedClasses['disabled']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "build-header" },
        });
        /** @type {__VLS_StyleScopedClasses['build-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "build-name" },
        });
        /** @type {__VLS_StyleScopedClasses['build-name']} */ ;
        (def.name);
        if (__VLS_ctx.getCount(def.id) > 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "build-count font-mono" },
            });
            /** @type {__VLS_StyleScopedClasses['build-count']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            (__VLS_ctx.getCount(def.id));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "build-effect" },
        });
        /** @type {__VLS_StyleScopedClasses['build-effect']} */ ;
        (def.effect);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "build-costs" },
        });
        /** @type {__VLS_StyleScopedClasses['build-costs']} */ ;
        for (const [cost] of __VLS_vFor((__VLS_ctx.formatCost(def.id)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (cost.resId),
                ...{ class: "cost-tag" },
                ...{ class: ({ unaffordable: !cost.affordable }) },
            });
            /** @type {__VLS_StyleScopedClasses['cost-tag']} */ ;
            /** @type {__VLS_StyleScopedClasses['unaffordable']} */ ;
            (__VLS_ctx.getResourceName(cost.resId));
            (cost.amount.toLocaleString());
            // @ts-ignore
            [game, getCount, getCount, formatCost, getResourceName,];
        }
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.availableBuildings.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ style: {} },
    });
}
// @ts-ignore
[availableBuildings,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
