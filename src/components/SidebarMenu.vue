<script setup lang="ts">
import { getChildren } from '../composables/useManifest'
import SidebarTreeNode from './SidebarTreeNode.vue'

// Пока в манифесте только один раздел — «rules» (см. CLAUDE.md, Разделы.yml в хранилище).
const sectionId = 'rules'
const roots = getChildren(null, sectionId)
</script>

<template>
  <nav class="tree" aria-label="Дерево раздела">
    <ul>
      <SidebarTreeNode v-for="node in roots" :key="node.id" :page="node" :section-id="sectionId" />
    </ul>
  </nav>
</template>
