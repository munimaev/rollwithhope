<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Item { full: string; alt: string }

const open = ref(false)
const items = ref<Item[]>([])
const index = ref(0)

function collect(container: ParentNode): Item[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.dh-card')).map((el) => ({
    full: el.dataset.full ?? '',
    alt: el.querySelector('img')?.getAttribute('alt') ?? '',
  }))
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const btn = target.closest('.dh-card') as HTMLElement | null
  if (!btn) return
  const container = btn.closest('.dh-article') ?? document.body
  const all = collect(container)
  const idx = Array.from(container.querySelectorAll('.dh-card')).indexOf(btn)
  items.value = all
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

// свайп на телефоне
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
  <div v-if="open" class="dh-lightbox" @click.self="close" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <button type="button" class="dh-lightbox__close" @click="close" aria-label="Закрыть">✕</button>
    <button v-if="items.length > 1" type="button" class="dh-lightbox__nav dh-lightbox__nav--prev" @click="prev" aria-label="Предыдущая карта">‹</button>
    <img class="dh-lightbox__img" :src="items[index]?.full" :alt="items[index]?.alt" />
    <button v-if="items.length > 1" type="button" class="dh-lightbox__nav dh-lightbox__nav--next" @click="next" aria-label="Следующая карта">›</button>
  </div>
</template>
