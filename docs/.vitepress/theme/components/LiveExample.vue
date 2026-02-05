<script setup lang="ts">
/**
 * LiveExample.vue - Runs JavaScript code in a safe, client-only context
 * 
 * This component is designed to let documentation authors write vanilla JavaScript
 * that runs after the page loads, without needing to understand Vue.
 * 
 * The component:
 * - Waits for client-side mount
 * - Waits for external scripts (Bokeh, D3) to be available
 * - Executes the provided setup function
 * - Handles cleanup on unmount
 * 
 * Usage in Markdown (with script setup):
 * 
 * <LiveExample 
 *   :setup="initChart" 
 *   :cleanup="cleanupChart"
 *   :deps="['Bokeh', 'd3']"
 * />
 * 
 * <script setup>
 * const initChart = async () => {
 *   // Your vanilla JS code here
 * }
 * const cleanupChart = () => {
 *   // Optional cleanup
 * }
 * <\/script>
 */
import { onMounted, onUnmounted, ref } from 'vue'

interface LiveExampleProps {
  /** Function to run when the component mounts and dependencies are ready */
  setup: () => void | Promise<unknown>
  /** Optional cleanup function to run on unmount */
  cleanup?: () => void
  /** Array of global variable names to wait for before running setup */
  deps?: string[]
  /** Maximum time to wait for dependencies (ms) */
  timeout?: number
}

const props = defineProps<LiveExampleProps>()

const error = ref<string | null>(null)
const initialized = ref(false)

/**
 * Wait for global dependencies to be available
 * This is needed because external scripts (Bokeh, D3) load asynchronously
 */
const waitForDeps = async (deps: string[], timeout: number): Promise<unknown> => {
  const startTime = Date.now()
  
  const checkDeps = (): boolean => {
    return deps.every(dep => {
      // Handle nested properties like 'Bokeh.Plotting'
      const parts = dep.split('.')
      let obj: unknown = window
      for (const part of parts) {
        obj = (obj as Record<string, unknown>)?.[part]
        if (obj === undefined) return false
      }
      return true
    })
  }
  
  while (!checkDeps()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for dependencies: ${deps.join(', ')}`)
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

onMounted(async () => {
  try {
    // Wait for dependencies if specified
    if (props.deps && props.deps.length > 0) {
      await waitForDeps(props.deps, props.timeout || 5000)
    }
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Run the setup function
    if (props.setup) {
      await props.setup()
    }
    
    initialized.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    console.error('LiveExample setup error:', e)
  }
})

onUnmounted(() => {
  if (props.cleanup) {
    try {
      props.cleanup()
    } catch (e) {
      console.error('LiveExample cleanup error:', e)
    }
  }
})
</script>

<template>
  <ClientOnly>
    <!-- This component is invisible - it just runs code -->
    <div v-if="error" class="live-example-error" role="alert">
      <strong>Example Error:</strong> {{ error }}
    </div>
    <slot v-else-if="initialized"></slot>
  </ClientOnly>
</template>

<style scoped>
.live-example-error {
  padding: 1rem;
  margin: 1rem 0;
  background: var(--vp-c-danger-soft);
  border: 1px solid var(--vp-c-danger-1);
  border-radius: 8px;
  color: var(--vp-c-danger-1);
  font-size: 0.875rem;
}
</style>
