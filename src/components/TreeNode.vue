<script setup lang="ts">
import { computed, ref } from 'vue'
import { getChildren } from '../composables/useManifest'
import type { ManifestPage } from '../composables/useManifest'

const props = defineProps<{
  page: ManifestPage
  currentPageId: string | null
  expandedIds: Set<string>
}>()

const children = computed(() => getChildren(props.page.id, props.page.sectionId))
const isCurrent = computed(() => props.page.id === props.currentPageId)
const expanded = ref(props.expandedIds.has(props.page.id))
</script>

<template>
  <div class="dh-tree-node" :class="{ 'dh-tree-node--current': isCurrent }">
    <div class="dh-tree-node__row">
      <button
        v-if="children.length"
        type="button"
        class="dh-tree-node__toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >{{ expanded ? '▾' : '▸' }}</button>
      <span v-else class="dh-tree-node__toggle-spacer" />
      <a :href="page.url" class="dh-tree-node__link">{{ page.title }}</a>
    </div>
    <div v-if="children.length && expanded" class="dh-tree-node__children">
      <TreeNode
        v-for="c in children"
        :key="c.id"
        :page="c"
        :current-page-id="currentPageId"
        :expanded-ids="expandedIds"
      />
    </div>
  </div>
</template>
