<script setup lang="ts">
import { useManifest } from '../composables/useManifest'

const { sections } = useManifest()
</script>

<template>
  <header class="app-header">
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
