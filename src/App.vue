<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeTopBar from './components/HomeTopBar.vue'
import SidebarMenu from './components/SidebarMenu.vue'
import CardLightbox from './components/CardLightbox.vue'
import { shouldInterceptClick } from './router/linkInterception'

const route = useRoute()
const router = useRouter()
const isHomeRoute = computed(() => route.name === 'home' || route.meta.homeLayout === true)

// Внутренние ссылки по всему приложению ...
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

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <template v-if="isHomeRoute">
    <router-view />
  </template>

  <div v-else class="site-shell">
    <HomeTopBar />
    <div class="layout">
      <SidebarMenu />
      <main class="content" data-pagefind-body>
        <router-view />
      </main>
    </div>
  </div>
  <CardLightbox v-if="!isHomeRoute" />
</template>

<style>
.site-shell {
  min-height: 100vh;
  background: linear-gradient(90deg, rgba(255,255,255,.35), transparent 10%, transparent 90%, rgba(255,255,255,.25)), var(--paper, #f5edd9);
}

.layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  max-width: 1500px;
  margin: 0 auto;
}

.content {
  padding: 28px 28px 80px;
  width: 100%;
}

@media (max-width: 760px) {
  .layout { display: block; }
  .content { padding: 20px 16px 50px; }
}
</style>
