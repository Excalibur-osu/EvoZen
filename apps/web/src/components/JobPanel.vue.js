import { computed } from 'vue';
import { useGameStore } from '../stores/game';
import { BASE_JOBS } from '@evozen/game-core';
const game = useGameStore();
/** 可见岗位 */
const visibleJobs = computed(() => {
    return BASE_JOBS.filter(job => {
        if (job.id === 'unemployed')
            return true;
        const civicJob = game.state.civic[job.id];
        return civicJob?.display ?? false;
    });
});
function getWorkers(jobId) {
    return game.state.civic[jobId]?.workers ?? 0;
}
function getMax(jobId) {
    return game.state.civic[jobId]?.max ?? -1;
}
/** 产出标签 */
const JOB_OUTPUT = {
    hunter: '🍖 食物 + 🧶 毛皮',
    farmer: '🌾 食物',
    lumberjack: '🪵 木材',
    quarry_worker: '🪨 石头',
    miner: '🔶 铜/铁',
    coal_miner: '⚫ 煤炭',
    cement_worker: '🧱 水泥 (消耗石头)',
    banker: '💰 金币加成',
    professor: '📚 知识',
    scientist: '🔬 知识',
    entertainer: '🎭 士气',
    craftsman: '🔨 制造',
};
function canAssignMore(jobId) {
    if (getWorkers('unemployed') <= 0)
        return false;
    const max = getMax(jobId);
    if (max < 0)
        return true; // 无限制
    return getWorkers(jobId) < max;
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ctrl-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ctrl-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "job-list" },
});
/** @type {__VLS_StyleScopedClasses['job-list']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "section-title" },
});
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
for (const [job] of __VLS_vFor((__VLS_ctx.visibleJobs))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (job.id),
        ...{ class: "job-row" },
        ...{ class: ({ 'job-unemployed': job.id === 'unemployed' }) },
    });
    /** @type {__VLS_StyleScopedClasses['job-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['job-unemployed']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "job-info" },
    });
    /** @type {__VLS_StyleScopedClasses['job-info']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "job-name-row" },
    });
    /** @type {__VLS_StyleScopedClasses['job-name-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "job-name" },
    });
    /** @type {__VLS_StyleScopedClasses['job-name']} */ ;
    (job.name);
    if (__VLS_ctx.JOB_OUTPUT[job.id]) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "job-output text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['job-output']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.JOB_OUTPUT[job.id]);
    }
    if (job.id !== 'unemployed') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "job-desc text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['job-desc']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (job.description);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "job-controls" },
    });
    /** @type {__VLS_StyleScopedClasses['job-controls']} */ ;
    if (job.id !== 'unemployed') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(job.id !== 'unemployed'))
                        return;
                    __VLS_ctx.game.removeWorker(job.id);
                    // @ts-ignore
                    [visibleJobs, JOB_OUTPUT, JOB_OUTPUT, game,];
                } },
            ...{ class: "ctrl-btn" },
            disabled: (__VLS_ctx.getWorkers(job.id) <= 0),
            title: "减少工人",
        });
        /** @type {__VLS_StyleScopedClasses['ctrl-btn']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "job-count font-mono" },
    });
    /** @type {__VLS_StyleScopedClasses['job-count']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
    (__VLS_ctx.getWorkers(job.id));
    if (__VLS_ctx.getMax(job.id) >= 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "job-max font-mono text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['job-max']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        (__VLS_ctx.getMax(job.id));
    }
    else if (job.id !== 'unemployed') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "job-max font-mono text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['job-max']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    }
    if (job.id !== 'unemployed') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(job.id !== 'unemployed'))
                        return;
                    __VLS_ctx.game.assignWorker(job.id);
                    // @ts-ignore
                    [game, getWorkers, getWorkers, getMax, getMax,];
                } },
            ...{ class: "ctrl-btn" },
            disabled: (!__VLS_ctx.canAssignMore(job.id)),
            title: "增加工人",
        });
        /** @type {__VLS_StyleScopedClasses['ctrl-btn']} */ ;
    }
    // @ts-ignore
    [canAssignMore,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
