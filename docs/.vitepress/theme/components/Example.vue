<script setup lang="ts">
/**
 * Example.vue - A container component for Data Navigator interactive examples
 */
import { ref, onMounted } from 'vue'

interface ExampleProps {
  id: string
  height?: string
  label?: string
  wrapperClass?: string
}

const props = defineProps<ExampleProps>()
const containerRef = ref<HTMLElement | null>(null)
const ready = ref(false)

onMounted(() => {
  ready.value = true
})

defineExpose({ containerRef, ready })
</script>

<template>
  <ClientOnly>
    <figure 
      :id="id + '-wrapper'" 
      class="example-wrapper"
      :class="wrapperClass"
      :style="{ minHeight: height || '300px' }"
      role="figure"
      :aria-label="label || 'Interactive example'"
    >
      <div 
        :id="id" 
        ref="containerRef"
        class="example-container"
      ></div>
      <div 
        :id="id + '-tooltip'" 
        class="example-tooltip hidden"
        role="status"
        aria-live="polite"
      ></div>
    </figure>
    <template #fallback>
      <div 
        class="example-loading" 
        :style="{ minHeight: height || '300px' }"
        role="status"
        aria-label="Loading example"
      >
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>Loading example...</span>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.example-wrapper {
  position: relative;
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
}

.example-container {
  width: 100%;
}

.example-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
