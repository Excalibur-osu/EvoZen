import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getResourceName } from '../utils/resourceNames';
const game = useGameStore();
const allResources = computed(() => {
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
        return '—';
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
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['res-table']} */ ;
/** @type {__VLS_StyleScopedClasses['res-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "res-detail-panel" },
});
/** @type {__VLS_StyleScopedClasses['res-detail-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "section-title" },
});
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({
    ...{ class: "res-table" },
});
/** @type {__VLS_StyleScopedClasses['res-table']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "col-name" },
});
/** @type {__VLS_StyleScopedClasses['col-name']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "col-num" },
});
/** @type {__VLS_StyleScopedClasses['col-num']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "col-num" },
});
/** @type {__VLS_StyleScopedClasses['col-num']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "col-num" },
});
/** @type {__VLS_StyleScopedClasses['col-num']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({
    ...{ class: "col-bar" },
});
/** @type {__VLS_StyleScopedClasses['col-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [res] of __VLS_vFor((__VLS_ctx.allResources))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (res.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "col-name" },
    });
    /** @type {__VLS_StyleScopedClasses['col-name']} */ ;
    (res.name || __VLS_ctx.getResourceName(res.id));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "col-num font-mono" },
    });
    /** @type {__VLS_StyleScopedClasses['col-num']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    (__VLS_ctx.formatNum(res.amount));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "col-num font-mono" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['col-num']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    (res.max > 0 ? __VLS_ctx.formatNum(res.max) : '∞');
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "col-num font-mono" },
        ...{ class: (__VLS_ctx.rateClass(res.diff)) },
    });
    /** @type {__VLS_StyleScopedClasses['col-num']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    (__VLS_ctx.formatRate(res.diff));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "col-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['col-bar']} */ ;
    if (res.max > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mini-bar" },
        });
        /** @type {__VLS_StyleScopedClasses['mini-bar']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "mini-fill" },
            ...{ style: ({
                    width: __VLS_ctx.fillPercent(res) + '%',
                    background: __VLS_ctx.fillPercent(res) > 95 ? 'var(--danger)' : __VLS_ctx.fillPercent(res) > 75 ? 'var(--warning)' : 'var(--success)',
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['mini-fill']} */ ;
    }
    // @ts-ignore
    [allResources, getResourceName, formatNum, formatNum, rateClass, formatRate, fillPercent, fillPercent, fillPercent,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
