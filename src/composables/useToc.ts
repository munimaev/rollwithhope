import { reactive } from 'vue'

export interface TocHeading {
  id: string
  text: string
  level: number
}

export const tocState = reactive<{ items: TocHeading[]; activeId: string | null }>({
  items: [],
  activeId: null,
})
