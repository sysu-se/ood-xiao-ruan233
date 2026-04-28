<script>
  export let data = {};
  export let hideModal;
  
  let selectedValue = null;
  
  function handleStart() {
    if (selectedValue && data.onSelect) {
      data.onSelect(selectedValue);
    }
    hideModal();
  }
</script>

<div>
  <h1 class="text-2xl font-semibold mb-4">{data.title || '探索模式'}</h1>
  
  {#if data.message}
    <p class="mb-4">{data.message}</p>
  {/if}
  
  <div class="mb-6">
    <p class="text-sm text-gray-600 mb-3">选择要尝试的数字：</p>
    <div class="flex flex-wrap gap-3">
      {#each data.candidates as cand}
        <button 
          class="w-12 h-12 text-xl font-bold rounded-full"
          class:bg-primary={selectedValue === cand}
          class:text-white={selectedValue === cand}
          class:bg-gray-200={selectedValue !== cand}
          on:click={() => selectedValue = cand}>
          {cand}
        </button>
      {/each}
    </div>
  </div>
  
  <div class="flex justify-end space-x-3">
    <button class="btn btn-primary" disabled={!selectedValue} on:click={handleStart}>
      开始探索
    </button>
    <button class="btn" on:click={hideModal}>取消</button>
  </div>
</div>