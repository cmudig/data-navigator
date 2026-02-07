<script setup>
import DefaultTheme from 'vitepress/theme'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

function ensureMainLandmark() {
  nextTick(() => {
    const vpContent = document.getElementById('VPContent')
    if (vpContent) {
      vpContent.setAttribute('role', 'main')
    }
  })
}

onMounted(ensureMainLandmark)
watch(() => route.path, ensureMainLandmark)
</script>

<template>
  <DefaultTheme.Layout />
</template>
