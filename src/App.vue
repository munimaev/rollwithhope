<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeTopBar from './components/HomeTopBar.vue'
import SidebarMenu from './components/SidebarMenu.vue'
import CardLightbox from './components/CardLightbox.vue'
import { tocState } from './composables/useToc'
import { treeDrawerState, closeTreeDrawer } from './composables/useTreeDrawer'
import { shouldInterceptClick } from './router/linkInterception'

const route = useRoute()
const router = useRouter()
const isHomeRoute = computed(() => route.name === 'home' || route.meta.homeLayout === true)

watch(() => route.fullPath, closeTreeDrawer)

function onDrawerKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeTreeDrawer()
}

function onDocumentClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement | null)?.closest?.('a')
  const href = anchor?.getAttribute('href')
  const target = shouldInterceptClick(
    e,
    anchor ? { target: anchor.target, hasDownload: anchor.hasAttribute('download') } : null,
    href,
  )
  if (!target) return
  e.preventDefault()
  router.push(target)
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDrawerKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDrawerKeydown)
})
</script>

<template>
  <template v-if="isHomeRoute">
    <router-view />
  </template>

  <div v-else class="app-shell">
    <HomeTopBar />
    <div class="app-main">
      <nav class="app-col-side app-col-tree app-col-side--sticky">
        <SidebarMenu />
      </nav>
      <main class="app-col-main" data-pagefind-body>
        <router-view />
      </main>
      <aside class="app-col-side app-col-toc app-col-side--sticky" v-if="tocState.items.length">
        <nav class="toc" aria-label="На этой странице">
          <p class="toc-title">На этой странице</p>
          <ol>
            <li v-for="t in tocState.items" :key="t.id" :data-level="t.level">
              <a :href="`#${t.id}`" :aria-current="t.id === tocState.activeId ? 'true' : undefined">{{ t.text }}</a>
            </li>
          </ol>
        </nav>
      </aside>
    </div>
    <div class="tree-drawer-backdrop" v-if="treeDrawerState.open" @click.self="closeTreeDrawer">
      <div class="tree-drawer" role="dialog" aria-modal="true" aria-label="Дерево раздела">
        <div class="tree-drawer-head">
          <b>Правила</b>
          <button class="icon-btn" aria-label="Закрыть" @click="closeTreeDrawer">
            <svg class="icon-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <SidebarMenu />
      </div>
    </div>
  </div>
  <CardLightbox v-if="!isHomeRoute" />
</template>
