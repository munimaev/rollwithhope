<script setup lang="ts">
import { useManifest } from '../composables/useManifest'
import { openTreeDrawer } from '../composables/useTreeDrawer'

const { sections } = useManifest()
</script>

<template>
  <header class="app-header">
    <button class="icon-btn app-header-menu" aria-label="Открыть дерево раздела" @click="openTreeDrawer">
      <svg class="icon-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
    <div class="app-header-brand">
      <a href="/" class="brandmark">
        <span class="brandmark-word">
          <span class="brandmark-name">roll with hope</span>
          <span class="brandmark-sub">DaggerHeart · Правила</span>
        </span>
      </a>
    </div>
    <div class="app-header-spacer" />
    <nav class="section-switcher" aria-label="Разделы">
      <a v-for="s in sections" :key="s.id" :href="s.urlPrefix" aria-current="page">{{ s.title }}</a>
    </nav>
  </header>
</template>
