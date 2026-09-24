<script setup lang="ts">
import { useManifest } from '../composables/useManifest'

const { sections } = useManifest()
</script>

<template>
  <div class="home-hero">
    <span class="brandmark">
      <span class="brandmark-word">
        <span class="brandmark-name">roll with hope</span>
        <span class="brandmark-sub">DaggerHeart · Правила</span>
      </span>
    </span>
    <p>Правила Daggerheart на русском — читайте онлайн.</p>
  </div>
  <div class="section-cards">
    <a v-for="s in sections" :key="s.id" :href="s.urlPrefix" class="section-card">
      <span class="section-card-title">{{ s.title }}</span>
    </a>
  </div>
</template>
