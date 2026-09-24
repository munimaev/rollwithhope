<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getChildren, type ManifestPage } from '../composables/useManifest'

const props = defineProps<{ page: ManifestPage; sectionId: string }>()

const route = useRoute()
const children = computed(() => getChildren(props.page.id, props.sectionId))
const isCurrent = computed(() => route.path === props.page.url)
const containsCurrent = computed(() => route.path === props.page.url || route.path.startsWith(`${props.page.url}/`))
</script>

<template>
  <li :data-chapter="page.chapter">
    <details v-if="children.length" :open="containsCurrent">
      <summary>
        <span class="marker" data-marker="minor" v-if="page.chapter" />
        <span>{{ page.title }}</span>
      </summary>
      <ul>
        <SidebarTreeNode v-for="child in children" :key="child.id" :page="child" :section-id="sectionId" />
      </ul>
    </details>
    <a v-else :href="page.url ?? undefined" :aria-current="isCurrent ? 'page' : undefined">
      <span class="marker" data-marker="minor" v-if="page.chapter" />
      <span>{{ page.title }}</span>
    </a>
  </li>
</template>
