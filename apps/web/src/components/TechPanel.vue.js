import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { BASIC_TECHS } from '@evozen/game-core';
import { getResourceName } from '../utils/resourceNames';
const game = useGameStore();
/** 可研究的科技 */
const availableTechs = computed(() => {
    return BASIC_TECHS.filter(t => game.isTechAvailable(t.id));
});
/** 已研究完成的科技 */
const completedTechs = computed(() => {
    return BASIC_TECHS.filter(t => {
        const [grantKey, grantLvl] = t.grant;
        return (game.state.tech[grantKey] ?? 0) >= grantLvl;
    });
});
function formatCost(costs) {
    return Object.entries(costs).map(([resId, amount]) => ({
        resId,
        amount: Math.ceil(amount),
        affordable: (game.state.resource[resId]?.amount ?? 0) >= amount,
    }));
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tech-item']} */ ;
/** @type {__VLS_StyleScopedClasses['tech-item']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-tag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "tech-panel" },
});
/** @type {__VLS_StyleScopedClasses['tech-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "section-title" },
});
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
if (__VLS_ctx.availableTechs.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
}
for (const [tech] of __VLS_vFor((__VLS_ctx.availableTechs))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.game.research(tech.id);
                // @ts-ignore
                [availableTechs, availableTechs, game,];
            } },
        key: (tech.id),
        ...{ class: "tech-item" },
        ...{ class: ({ disabled: !__VLS_ctx.game.canAffordTech(tech.id) }) },
    });
    /** @type {__VLS_StyleScopedClasses['tech-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['disabled']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tech-header" },
    });
    /** @type {__VLS_StyleScopedClasses['tech-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "tech-name" },
    });
    /** @type {__VLS_StyleScopedClasses['tech-name']} */ ;
    (tech.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "tech-era text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['tech-era']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (tech.era);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "tech-effect" },
    });
    /** @type {__VLS_StyleScopedClasses['tech-effect']} */ ;
    (tech.effect);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tech-costs" },
    });
    /** @type {__VLS_StyleScopedClasses['tech-costs']} */ ;
    for (const [cost] of __VLS_vFor((__VLS_ctx.formatCost(tech.costs)))) {
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
        [game, formatCost, getResourceName,];
    }
    // @ts-ignore
    [];
}
if (__VLS_ctx.completedTechs.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "section-title" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
    (__VLS_ctx.completedTechs.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "completed-list" },
    });
    /** @type {__VLS_StyleScopedClasses['completed-list']} */ ;
    for (const [tech] of __VLS_vFor((__VLS_ctx.completedTechs))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (tech.id),
            ...{ class: "completed-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['completed-tag']} */ ;
        (tech.name);
        // @ts-ignore
        [completedTechs, completedTechs, completedTechs,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
