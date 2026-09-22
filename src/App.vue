<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from './components/TopBar.vue'
import SectionTree from './components/SectionTree.vue'
import CardLightbox from './components/CardLightbox.vue'
import { getPageByUrl } from './composables/useManifest'

const route = useRoute()
const currentPage = computed(() => getPageByUrl(route.path))
const currentSectionId = computed(() => currentPage.value?.sectionId ?? null)
</script>

<template>
  <div class="dh-shell">
    <TopBar />
    <div class="dh-shell-body">
      <SectionTree v-if="currentSectionId" :section-id="currentSectionId" :current-page-id="currentPage?.id ?? null" />
      <main class="dh-main" data-pagefind-body>
        <router-view />
      </main>
    </div>
  </div>
  <CardLightbox />
</template>
