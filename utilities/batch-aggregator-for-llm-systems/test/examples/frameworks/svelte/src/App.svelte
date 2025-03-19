<script>
  let count = 0;

  function increment() {
    count += 1;
  }
</script>

<div class="app">
  <header class="app-header">
    <h1>Svelte Example</h1>
    <p>Count: {count}</p>
    <button on:click={increment}>
      Increment
    </button>
  </header>
</div>

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