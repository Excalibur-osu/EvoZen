import { reactive } from 'vue'

export type ConfirmTone = 'default' | 'danger'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

interface ConfirmState extends Required<ConfirmOptions> {
  open: boolean
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: '确认',
  cancelLabel: '取消',
  tone: 'default',
})

let resolver: ((value: boolean) => void) | null = null

export function useConfirmDialog() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (resolver) {
      resolver(false)
    }
    state.open = true
    state.title = options.title
    state.message = options.message
    state.confirmLabel = options.confirmLabel ?? '确认'
    state.cancelLabel = options.cancelLabel ?? '取消'
    state.tone = options.tone ?? 'default'

    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function resolve(value: boolean) {
    state.open = false
    resolver?.(value)
    resolver = null
  }

  return { state, confirm, resolve }
}
