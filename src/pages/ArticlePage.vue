<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  getPageById, getBreadcrumbs, getPrevNext, getBacklinkPages, getChildren,
} from '../composables/useManifest'
import { getArticleHtml } from '../composables/useArticleHtml'

const route = useRoute()
const articleRef = ref<HTMLElement | null>(null)
const toc = ref<{ id: string; text: string; level: number }[]>([])
const activeHeadingId = ref<string | null>(null)
let observer: IntersectionObserver | null = null

const page = computed(() => getPageById(String(route.meta.pageId ?? '')))
const html = computed(() => (page.value ? getArticleHtml(page.value.id) ?? '' : ''))
const breadcrumbs = computed(() => (page.value ? getBreadcrumbs(page.value) : []))
const prevNext = computed(() => (page.value ? getPrevNext(page.value) : { prev: null, next: null }))
const backlinks = computed(() => (page.value ? getBacklinkPages(page.value) : []))
const childPages = computed(() => (page.value ? getChildren(page.value.id, page.value.sectionId) : []))

function slugifyHeading(text: string, used: Set<string>): string {
  let base = text.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section'
  let candidate = base
  let n = 2
  while (used.has(candidate)) candidate = `${base}-${n++}`
  used.add(candidate)
  return candidate
}

function buildToc() {
  if (observer) { observer.disconnect(); observer = null }
  toc.value = []
  const el = articleRef.value
  if (!el) return
  const used = new Set<string>()
  const headings = Array.from(el.querySelectorAll('h4, h5, h6')) as HTMLElement[]
  const entries = headings.map((h) => {
    const id = slugifyHeading(h.textContent ?? '', used)
    h.id = id
    const level = Number(h.tagName.slice(1))
    return { id, text: h.textContent ?? '', level }
  })
  toc.value = entries
  if (entries.length) {
    observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((o) => o.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) activeHeadingId.value = (visible[0].target as HTMLElement).id
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    headings.forEach((h) => observer!.observe(h))
  }
}

onMounted(() => nextTick(buildToc))
watch(() => route.fullPath, () => nextTick(buildToc))
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <article v-if="page" class="dh-page">
    <nav class="dh-breadcrumbs" aria-label="Хлебные крошки">
      <template v-for="(b, i) in breadcrumbs" :key="b.id">
        <a :href="b.url">{{ b.title }}</a>
        <span v-if="i < breadcrumbs.length - 1" class="dh-breadcrumbs__sep">/</span>
      </template>
    </nav>

    <h1 class="dh-page__title">{{ page.title }}</h1>

    <div class="dh-page__body">
      <div ref="articleRef" class="dh-article" v-html="html" />

      <ul v-if="page.isIndex && childPages.length" class="dh-index-grid">
        <li v-for="c in childPages" :key="c.id">
          <a :href="c.url">{{ c.title }}</a>
        </li>
      </ul>

      <aside v-if="toc.length" class="dh-toc" aria-label="На этой странице">
        <p class="dh-toc__title">На этой странице</p>
        <ul>
          <li v-for="t in toc" :key="t.id" :class="[`dh-toc__level-${t.level}`, { 'dh-toc__active': t.id === activeHeadingId }]">
            <a :href="`#${t.id}`">{{ t.text }}</a>
          </li>
        </ul>
      </aside>
    </div>

    <nav class="dh-prevnext">
      <a v-if="prevNext.prev" :href="prevNext.prev.url" class="dh-prevnext__prev">← {{ prevNext.prev.title }}</a>
      <span v-else />
      <a v-if="prevNext.next" :href="prevNext.next.url" class="dh-prevnext__next">{{ prevNext.next.title }} →</a>
    </nav>

    <section v-if="backlinks.length" class="dh-backlinks">
      <p class="dh-backlinks__title">Где упоминается</p>
      <ul>
        <li v-for="b in backlinks" :key="b.id"><a :href="b.url">{{ b.title }}</a></li>
      </ul>
    </section>
  </article>
  <article v-else class="dh-page dh-page--missing">
    <p>Страница не найдена в манифесте.</p>
  </article>
</template>
