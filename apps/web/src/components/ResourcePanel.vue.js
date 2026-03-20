import { computed } from 'vue';
import { useGameStore } from '../stores/game';
const game = useGameStore();
/** 显示的资源列表 */
const visibleResources = computed(() => {
    return Object.entries(game.state.resource)
        .filter(([_, res]) => res.display)
        .map(([id, res]) => ({ id, ...res }));
});
function formatNum(n) {
    if (Math.abs(n) >= 1e6)
        return (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3)
        return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
}
function formatRate(n) {
    if (n === 0)
        return '';
    const sign = n > 0 ? '+' : '';
    if (Math.abs(n) < 0.01)
        return sign + n.toFixed(3);
    return sign + n.toFixed(2);
}
function rateClass(n) {
    if (n > 0)
        return 'rate-positive';
    if (n < 0)
        return 'rate-negative';
    return 'rate-zero';
}
function fillPercent(res) {
    if (res.max <= 0)
        return 0;
    return Math.min(100, (res.amount / res.max) * 100);
}
function fillColor(res) {
    const pct = fillPercent(res);
    if (pct > 99)
        return 'var(--danger)';
    if (pct > 75)
        return 'var(--warning)';
    return 'var(--success)';
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['res-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "resource-list" },
});
/** @type {__VLS_StyleScopedClasses['resource-list']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "res-header" },
});
/** @type {__VLS_StyleScopedClasses['res-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "res-section-title" },
});
/** @type {__VLS_StyleScopedClasses['res-section-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "res-scroll" },
});
/** @type {__VLS_StyleScopedClasses['res-scroll']} */ ;
for (const [res] of __VLS_vFor((__VLS_ctx.visibleResources))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (res.id),
        ...{ class: "res-row" },
    });
    /** @type {__VLS_StyleScopedClasses['res-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "res-top" },
    });
    /** @type {__VLS_StyleScopedClasses['res-top']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "res-name" },
    });
    /** @type {__VLS_StyleScopedClasses['res-name']} */ ;
    (res.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "res-amount font-mono" },
    });
    /** @type {__VLS_StyleScopedClasses['res-amount']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    (__VLS_ctx.formatNum(res.amount));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "res-bottom" },
    });
    /** @type {__VLS_StyleScopedClasses['res-bottom']} */ ;
    if (res.diff !== 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "res-rate font-mono" },
            ...{ class: (__VLS_ctx.rateClass(res.diff)) },
        });
        /** @type {__VLS_StyleScopedClasses['res-rate']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        (__VLS_ctx.formatRate(res.diff));
    }
    if (res.max > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "res-max font-mono" },
        });
        /** @type {__VLS_StyleScopedClasses['res-max']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        (__VLS_ctx.formatNum(res.max));
    }
    if (res.max > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "progress-bar" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "fill" },
            ...{ style: ({
                    width: __VLS_ctx.fillPercent(res) + '%',
                    background: __VLS_ctx.fillColor(res)
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['fill']} */ ;
    }
    // @ts-ignore
    [visibleResources, formatNum, formatNum, rateClass, formatRate, fillPercent, fillColor,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
