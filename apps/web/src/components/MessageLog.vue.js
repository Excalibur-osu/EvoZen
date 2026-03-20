import { computed, ref, nextTick, watch } from 'vue';
import { useGameStore } from '../stores/game';
const game = useGameStore();
const logContainer = ref(null);
const recentMessages = computed(() => {
    return game.messages.slice(-80);
});
watch(() => game.messages.length, async () => {
    await nextTick();
    if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
});
function msgClass(type) {
    switch (type) {
        case 'success': return 'msg-success';
        case 'danger': return 'msg-danger';
        case 'warning': return 'msg-warning';
        case 'special': return 'msg-special';
        default: return 'msg-info';
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "message-log-section" },
});
/** @type {__VLS_StyleScopedClasses['message-log-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "log-header" },
});
/** @type {__VLS_StyleScopedClasses['log-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "log-title" },
});
/** @type {__VLS_StyleScopedClasses['log-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "log-list" },
    ref: "logContainer",
});
/** @type {__VLS_StyleScopedClasses['log-list']} */ ;
for (const [msg, i] of __VLS_vFor((__VLS_ctx.recentMessages))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        key: (i),
        ...{ class: "log-item" },
        ...{ class: (__VLS_ctx.msgClass(msg.type)) },
    });
    /** @type {__VLS_StyleScopedClasses['log-item']} */ ;
    (msg.text);
    // @ts-ignore
    [recentMessages, msgClass,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
