<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const open = ref(false)
let uiLoaded = false

async function ensureUi() {
  if (uiLoaded) return
  const base = import.meta.env.BASE_URL
  await new Promise<void>((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${base}pagefind/pagefind-ui.css`
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })
  await import(/* @vite-ignore */ `${base}pagefind/pagefind-ui.js`).catch(() => null)
  const PagefindUI = (window as any).PagefindUI
  if (PagefindUI) {
    new PagefindUI({ element: '#dh-search-mount', showSubResults: true, showImages: false })
  }
  uiLoaded = true
}

watch(open, (v) => { if (v) ensureUi() })

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

defineExpose({ show: () => { open.value = true } })

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="open" class="dh-search-modal" @click.self="open = false">
    <div class="dh-search-modal__panel">
      <div id="dh-search-mount" />
    </div>
  </div>
</template>
