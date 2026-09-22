<script setup lang="ts">
import { useManifest } from '../composables/useManifest'

const { sections } = useManifest()
</script>

<template>
  <div class="dh-home">
    <h1>roll with hope</h1>
    <p class="dh-home__subtitle">Правила Daggerheart на русском — читать онлайн</p>
    <div class="dh-home__sections">
      <a v-for="s in sections" :key="s.id" :href="s.urlPrefix" class="dh-home__card" :style="{ '--dh-section-color': `var(${s.color})` }">
        <span class="dh-home__card-title">{{ s.title }}</span>
      </a>
    </div>
  </div>
</template>
