import { reactive } from 'vue'

export const treeDrawerState = reactive<{ open: boolean }>({ open: false })

export function openTreeDrawer() {
  treeDrawerState.open = true
}

export function closeTreeDrawer() {
  treeDrawerState.open = false
}
