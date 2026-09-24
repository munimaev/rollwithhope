<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  getPageById, getBreadcrumbs, getPrevNext, getBacklinkPages,
} from '../composables/useManifest'
import { getArticleComponent } from '../composables/useArticleComponent'
import { tocState } from '../composables/useToc'

const route = useRoute()
const articleRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const page = computed(() => getPageById(String(route.meta.pageId ?? '')))
const ArticleComponent = computed(() => (page.value ? getArticleComponent(page.value.id) : undefined))
const breadcrumbs = computed(() => (page.value ? getBreadcrumbs(page.value) : []))
const prevNext = computed(() => (page.value ? getPrevNext(page.value) : { prev: null, next: null }))
const backlinks = computed(() => (page.value ? getBacklinkPages(page.value) : []))

function buildToc() {
  if (observer) { observer.disconnect(); observer = null }
  tocState.items = []
  tocState.activeId = null
  const el = articleRef.value
  if (!el) return
  const headings = Array.from(el.querySelectorAll('h2[id], h3[id], h4[id], h5[id], h6[id]')) as HTMLElement[]
  tocState.items = headings.map((h) => ({ id: h.id, text: h.textContent ?? '', level: Number(h.tagName.slice(1)) }))
  if (headings.length) {
    observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((o) => o.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) tocState.activeId = (visible[0].target as HTMLElement).id
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    headings.forEach((h) => observer!.observe(h))
  }
}

onMounted(() => nextTick(buildToc))
watch(() => route.fullPath, () => nextTick(buildToc))
onBeforeUnmount(() => {
  observer?.disconnect()
  tocState.items = []
  tocState.activeId = null
})
</script>

<template>
  <article v-if="page">
    <nav class="crumbs" aria-label="Хлебные крошки">
      <a v-if="breadcrumbs.length > 1" :href="breadcrumbs[breadcrumbs.length - 2].url" class="crumbs-back">Назад</a>
      <ol>
        <li v-for="(b, i) in breadcrumbs" :key="b.id" :aria-current="i === breadcrumbs.length - 1 ? 'page' : undefined">
          <a :href="b.url">{{ b.title }}</a>
        </li>
      </ol>
    </nav>

    <header class="hero" data-has-banner="false">
      <p class="eyebrow" v-if="page.tags.length">{{ page.tags[0] }}</p>
      <h1>{{ page.title }}</h1>
      <p class="meta" v-if="page.original"><span class="original">{{ page.original }}</span></p>
    </header>

    <div ref="articleRef">
      <component :is="ArticleComponent" v-if="ArticleComponent" />
    </div>

    <nav class="series" aria-label="Серия">
      <a v-if="prevNext.prev" :href="prevNext.prev.url" class="series-link series-link--prev">
        <span class="series-dir">Назад</span>
        <span class="series-title">{{ prevNext.prev.title }}</span>
      </a>
      <a v-if="prevNext.next" :href="prevNext.next.url" class="series-link series-link--next">
        <span class="series-dir">Далее</span>
        <span class="series-title">{{ prevNext.next.title }}</span>
      </a>
    </nav>

    <section class="related-section" v-if="backlinks.length">
      <p class="related-title">Где упоминается</p>
      <ul class="backlinks-list">
        <li v-for="b in backlinks" :key="b.id"><a :href="b.url">{{ b.title }}</a></li>
      </ul>
    </section>
  </article>
  <article v-else>
    <p>Страница не найдена в манифесте.</p>
  </article>
</template>
