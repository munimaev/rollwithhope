<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useManifest } from '../composables/useManifest'
import SearchModal from './SearchModal.vue'

const { sections } = useManifest()
const theme = ref<'light' | 'dark'>('light')
const searchModal = ref<InstanceType<typeof SearchModal> | null>(null)

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme.value
  try { localStorage.setItem('dh-theme', theme.value) } catch { /* приватный режим и т.п. — не критично */ }
}

onMounted(() => {
  try {
    const saved = localStorage.getItem('dh-theme')
    if (saved === 'light' || saved === 'dark') {
      theme.value = saved
      document.documentElement.dataset.theme = saved
    }
  } catch { /* ignore */ }
})
</script>

<template>
  <header class="dh-topbar">
    <a class="dh-topbar__brand" href="/">roll with hope</a>
    <nav class="dh-topbar__sections">
      <a v-for="s in sections" :key="s.id" :href="s.urlPrefix" :style="{ '--dh-section-color': `var(${s.color})` }">
        {{ s.title }}
      </a>
    </nav>
    <div class="dh-topbar__actions">
      <button type="button" class="dh-topbar__search" @click="searchModal?.show()">🔍 Поиск <kbd>⌘K</kbd></button>
      <button type="button" class="dh-topbar__theme" @click="toggleTheme" :aria-label="'Переключить тему'">
        {{ theme === 'light' ? '🌙' : '☀️' }}
      </button>
    </div>
  </header>
  <SearchModal ref="searchModal" />
</template>
