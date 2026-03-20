import { useGameStore } from '../stores/game';
const game = useGameStore();
const speciesLabels = {
    human: '人类', elven: '精灵', orc: '兽人', dwarf: '矮人', goblin: '地精',
    protoplasm: '原生质'
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['bar-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bar-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "top-bar" },
});
/** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "bar-left" },
});
/** @type {__VLS_StyleScopedClasses['bar-left']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "game-logo" },
});
/** @type {__VLS_StyleScopedClasses['game-logo']} */ ;
if (!__VLS_ctx.game.isEvolving) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "species-label" },
    });
    /** @type {__VLS_StyleScopedClasses['species-label']} */ ;
    (__VLS_ctx.speciesLabels[__VLS_ctx.game.state.race.species] ?? __VLS_ctx.game.state.race.species);
}
if (!__VLS_ctx.game.isEvolving) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bar-center" },
    });
    /** @type {__VLS_StyleScopedClasses['bar-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "cal-year" },
    });
    /** @type {__VLS_StyleScopedClasses['cal-year']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.game.year);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "cal-day" },
    });
    /** @type {__VLS_StyleScopedClasses['cal-day']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.game.day);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "cal-season" },
        ...{ class: ('season-' + __VLS_ctx.game.state.city.calendar?.season) },
    });
    /** @type {__VLS_StyleScopedClasses['cal-season']} */ ;
    (__VLS_ctx.game.season);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "bar-right" },
});
/** @type {__VLS_StyleScopedClasses['bar-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.game.togglePause();
            // @ts-ignore
            [game, game, game, game, game, game, game, game, game, speciesLabels,];
        } },
    ...{ class: "bar-btn" },
});
/** @type {__VLS_StyleScopedClasses['bar-btn']} */ ;
(__VLS_ctx.game.isPaused ? '▶ 继续' : '⏸ 暂停');
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.game.save();
            // @ts-ignore
            [game, game,];
        } },
    ...{ class: "bar-btn" },
});
/** @type {__VLS_StyleScopedClasses['bar-btn']} */ ;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
