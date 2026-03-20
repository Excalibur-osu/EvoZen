import { useGameStore } from '../stores/game';
import { ref } from 'vue';
const game = useGameStore();
const speciesOptions = [
    { id: 'human', label: '人类', emoji: '🧑' },
    { id: 'elven', label: '精灵', emoji: '🧝' },
    { id: 'orc', label: '兽人', emoji: '👹' },
    { id: 'dwarf', label: '矮人', emoji: '⛏️' },
    { id: 'goblin', label: '地精', emoji: '👺' },
];
const selectedSpecies = ref('human');
function startEvolution() {
    const species = speciesOptions.find(s => s.id === selectedSpecies.value);
    game.startCivilization(species?.id ?? 'human');
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['evo-species']} */ ;
/** @type {__VLS_StyleScopedClasses['species-card']} */ ;
/** @type {__VLS_StyleScopedClasses['species-card']} */ ;
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-panel animate-in" },
});
/** @type {__VLS_StyleScopedClasses['evo-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-in']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-title-section" },
});
/** @type {__VLS_StyleScopedClasses['evo-title-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
    ...{ class: "evo-title" },
});
/** @type {__VLS_StyleScopedClasses['evo-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "evo-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['evo-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "quick-start-card" },
});
/** @type {__VLS_StyleScopedClasses['quick-start-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "quick-start-header" },
});
/** @type {__VLS_StyleScopedClasses['quick-start-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "quick-start-icon" },
});
/** @type {__VLS_StyleScopedClasses['quick-start-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "quick-start-title" },
});
/** @type {__VLS_StyleScopedClasses['quick-start-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "quick-start-desc" },
});
/** @type {__VLS_StyleScopedClasses['quick-start-desc']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.game.startCivilization('human');
            // @ts-ignore
            [game,];
        } },
    ...{ class: "btn primary quick-start-btn" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-start-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "divider" },
});
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "divider-text" },
});
/** @type {__VLS_StyleScopedClasses['divider-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-resources" },
});
/** @type {__VLS_StyleScopedClasses['evo-resources']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-res-item" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-res-header" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "evo-res-label" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "evo-res-value font-mono" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-value']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
(Math.floor(__VLS_ctx.game.state.resource['RNA']?.amount ?? 0));
(__VLS_ctx.game.state.resource['RNA']?.max ?? 100);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "progress-bar" },
});
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "fill" },
    ...{ style: ({ width: ((__VLS_ctx.game.state.resource['RNA']?.amount ?? 0) / (__VLS_ctx.game.state.resource['RNA']?.max ?? 100) * 100) + '%' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['fill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.game.gatherRNA();
            // @ts-ignore
            [game, game, game, game, game,];
        } },
    ...{ class: "btn primary" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-res-item" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "evo-res-header" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "evo-res-label" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "evo-res-value font-mono" },
});
/** @type {__VLS_StyleScopedClasses['evo-res-value']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
(Math.floor(__VLS_ctx.game.state.resource['DNA']?.amount ?? 0));
(__VLS_ctx.game.state.resource['DNA']?.max ?? 100);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "progress-bar" },
});
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "fill" },
    ...{ style: ({ width: ((__VLS_ctx.game.state.resource['DNA']?.amount ?? 0) / (__VLS_ctx.game.state.resource['DNA']?.max ?? 100) * 100) + '%' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['fill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.game.formDNA();
            // @ts-ignore
            [game, game, game, game, game,];
        } },
    ...{ class: "btn" },
    ...{ style: {} },
    disabled: ((__VLS_ctx.game.state.resource['RNA']?.amount ?? 0) < 2),
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
if ((__VLS_ctx.game.state.resource['DNA']?.amount ?? 0) >= 10) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "evo-species" },
    });
    /** @type {__VLS_StyleScopedClasses['evo-species']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "species-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['species-grid']} */ ;
    for (const [sp] of __VLS_vFor((__VLS_ctx.speciesOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.game.state.resource['DNA']?.amount ?? 0) >= 10))
                        return;
                    __VLS_ctx.selectedSpecies = sp.id;
                    // @ts-ignore
                    [game, game, speciesOptions, selectedSpecies,];
                } },
            key: (sp.id),
            ...{ class: "species-card" },
            ...{ class: ({ active: __VLS_ctx.selectedSpecies === sp.id }) },
        });
        /** @type {__VLS_StyleScopedClasses['species-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "species-emoji" },
        });
        /** @type {__VLS_StyleScopedClasses['species-emoji']} */ ;
        (sp.emoji);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "species-name" },
        });
        /** @type {__VLS_StyleScopedClasses['species-name']} */ ;
        (sp.label);
        // @ts-ignore
        [selectedSpecies,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!((__VLS_ctx.game.state.resource['DNA']?.amount ?? 0) >= 10))
                    return;
                __VLS_ctx.startEvolution();
                // @ts-ignore
                [startEvolution,];
            } },
        ...{ class: "btn primary" },
        ...{ style: {} },
        disabled: ((__VLS_ctx.game.state.resource['DNA']?.amount ?? 0) < 10),
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
}
// @ts-ignore
[game,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
