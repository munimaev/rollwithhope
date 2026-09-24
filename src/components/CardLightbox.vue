<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Item { full: string; alt: string }

const open = ref(false)
const items = ref<Item[]>([])
const index = ref(0)

function collect(container: ParentNode): HTMLImageElement[] {
  return Array.from(container.querySelectorAll<HTMLImageElement>('img[data-lightbox]'))
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const img = target.closest('img[data-lightbox]') as HTMLImageElement | null
  if (!img) return
  const container = img.closest('.prose') ?? document.body
  const all = collect(container)
  const idx = all.indexOf(img)
  items.value = all.map((el) => ({ full: el.dataset.full ?? el.src, alt: el.alt }))
  index.value = Math.max(0, idx)
  open.value = true
}

function close() {
  open.value = false
}

function prev() {
  if (items.value.length) index.value = (index.value - 1 + items.value.length) % items.value.length
}

function next() {
  if (items.value.length) index.value = (index.value + 1) % items.value.length
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

let touchStartX = 0
function onTouchStart(e: TouchEvent) { touchStartX = e.touches[0]?.clientX ?? 0 }
function onTouchEnd(e: TouchEvent) {
  const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX
  if (Math.abs(dx) > 40) (dx > 0 ? prev() : next())
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="open" class="lightbox-backdrop" @click.self="close" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <div class="lightbox-top">
      <span class="lightbox-counter" v-if="items.length > 1">{{ index + 1 }} / {{ items.length }}</span>
      <button type="button" class="icon-btn lightbox-close" @click="close" aria-label="Закрыть">✕</button>
    </div>
    <div class="lightbox-stage">
      <button v-if="items.length > 1" type="button" class="lightbox-nav lightbox-nav--prev" @click="prev" aria-label="Предыдущая карта">‹</button>
      <img :src="items[index]?.full" :alt="items[index]?.alt" />
      <button v-if="items.length > 1" type="button" class="lightbox-nav lightbox-nav--next" @click="next" aria-label="Следующая карта">›</button>
    </div>
    <div class="lightbox-bottom" v-if="items[index]?.alt">{{ items[index]?.alt }}</div>
  </div>
</template>
