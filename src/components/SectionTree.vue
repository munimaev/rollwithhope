<script setup lang="ts">
import { computed } from 'vue'
import { getChildren, getPageById, getBreadcrumbs, getSection } from '../composables/useManifest'
import TreeNode from './TreeNode.vue'

const props = defineProps<{ sectionId: string; currentPageId: string | null }>()

const section = computed(() => getSection(props.sectionId))
const topLevel = computed(() => getChildren(null, props.sectionId))

const expandedIds = computed(() => {
  const set = new Set<string>()
  if (props.currentPageId) {
    const page = getPageById(props.currentPageId)
    if (page) for (const p of getBreadcrumbs(page)) set.add(p.id)
  }
  return set
})
</script>

<template>
  <nav class="dh-tree" :style="section ? { '--dh-section-color': `var(${section.color})` } : undefined" aria-label="Оглавление раздела">
    <TreeNode
      v-for="p in topLevel"
      :key="p.id"
      :page="p"
      :current-page-id="currentPageId"
      :expanded-ids="expandedIds"
    />
  </nav>
</template>
