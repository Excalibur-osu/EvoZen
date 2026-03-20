import { onMounted, ref, computed } from 'vue';
import { useGameStore } from './stores/game';
import GameHeader from './components/GameHeader.vue';
import EvolutionPanel from './components/EvolutionPanel.vue';
import ResourcePanel from './components/ResourcePanel.vue';
import ResourceDetailPanel from './components/ResourceDetailPanel.vue';
import BuildPanel from './components/BuildPanel.vue';
import TechPanel from './components/TechPanel.vue';
import JobPanel from './components/JobPanel.vue';
import MessageLog from './components/MessageLog.vue';
const game = useGameStore();
const activeTab = ref('city');
onMounted(() => {
    game.init();
});
const tabs = computed(() => {
    if (game.isEvolving)
        return [];
    const list = [
        { id: 'city', label: cityTabLabel.value, visible: true },
        { id: 'civic', label: '市政', visible: game.state.settings.showCivic },
        { id: 'research', label: '研究', visible: true },
        { id: 'resources', label: '资源', visible: game.state.settings.showResources },
    ];
    return list.filter(t => t.visible);
});
/** 城市标签名根据人口动态变化（贴合原版） */
const cityTabLabel = computed(() => {
    const pop = game.population;
    if (pop <= 5)
        return '洞穴';
    if (pop <= 20)
        return '村落';
    if (pop <= 75)
        return '小镇';
    if (pop <= 250)
        return '城镇';
    if (pop <= 600)
        return '小城';
    if (pop <= 1200)
        return '中城';
    if (pop <= 2500)
        return '大城';
    return '都会';
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-container" },
});
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
const __VLS_0 = GameHeader;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-body" },
});
/** @type {__VLS_StyleScopedClasses['app-body']} */ ;
if (__VLS_ctx.game.isEvolving) {
    const __VLS_5 = EvolutionPanel;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({}));
    const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "left-column" },
    });
    /** @type {__VLS_StyleScopedClasses['left-column']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "race-header card" },
    });
    /** @type {__VLS_StyleScopedClasses['race-header']} */ ;
    /** @type {__VLS_StyleScopedClasses['card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-body" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['card-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "race-name" },
    });
    /** @type {__VLS_StyleScopedClasses['race-name']} */ ;
    (__VLS_ctx.game.state.race.species === 'human' ? '人类' : __VLS_ctx.game.state.race.species);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "race-meta flex items-center justify-between text-xs" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['race-meta']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (Math.floor(__VLS_ctx.game.population));
    const __VLS_10 = MessageLog;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({}));
    const __VLS_12 = __VLS_11({}, ...__VLS_functionalComponentArgsRest(__VLS_11));
    const __VLS_15 = ResourcePanel;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({}));
    const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "main-column" },
    });
    /** @type {__VLS_StyleScopedClasses['main-column']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tab-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['tab-bar']} */ ;
    for (const [tab] of __VLS_vFor((__VLS_ctx.tabs))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.game.isEvolving))
                        return;
                    __VLS_ctx.activeTab = tab.id;
                    // @ts-ignore
                    [game, game, game, game, tabs, activeTab,];
                } },
            key: (tab.id),
            ...{ class: "tab-btn" },
            ...{ class: ({ active: __VLS_ctx.activeTab === tab.id }) },
        });
        /** @type {__VLS_StyleScopedClasses['tab-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (tab.label);
        // @ts-ignore
        [activeTab,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tab-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tab-content']} */ ;
    if (__VLS_ctx.activeTab === 'city') {
        const __VLS_20 = BuildPanel;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent1(__VLS_20, new __VLS_20({}));
        const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    }
    if (__VLS_ctx.activeTab === 'civic') {
        const __VLS_25 = JobPanel;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({}));
        const __VLS_27 = __VLS_26({}, ...__VLS_functionalComponentArgsRest(__VLS_26));
    }
    if (__VLS_ctx.activeTab === 'research') {
        const __VLS_30 = TechPanel;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({}));
        const __VLS_32 = __VLS_31({}, ...__VLS_functionalComponentArgsRest(__VLS_31));
    }
    if (__VLS_ctx.activeTab === 'resources') {
        const __VLS_35 = ResourceDetailPanel;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({}));
        const __VLS_37 = __VLS_36({}, ...__VLS_functionalComponentArgsRest(__VLS_36));
    }
}
// @ts-ignore
[activeTab, activeTab, activeTab, activeTab,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
