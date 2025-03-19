<template>
  <div class="app">
    <header class="app-header">
      <h1>Vue Example</h1>
      <p>Count: {{ count }}</p>
      <button @click="increment">
        Increment
      </button>
    </header>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)

const increment = () => {
  count.value++
}
</script>

<style>
.app {
  text-align: center;
}

.app-header {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style> 