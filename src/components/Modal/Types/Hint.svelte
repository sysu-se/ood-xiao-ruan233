<script>
  export let data = {};
  export let hideModal;
  
  function handleApply() {
    if (data.onApply && data.type === 'forced') {
      data.onApply();
    }
    hideModal();
  }
</script>

<div>
  <h1 class="text-2xl font-semibold mb-4">{data.title || '提示'}</h1>
  
  <div class="mb-6 p-4 bg-gray-100 rounded-lg">
    <p class="text-lg">{data.message}</p>
    {#if data.reason}
      <p class="text-sm text-gray-600 mt-2">原因：{data.reason}</p>
    {/if}
  </div>
  
  {#if data.type === 'candidates' && data.data?.candidates}
    <div class="mb-6">
      <p class="text-sm text-gray-600 mb-2">候选数：</p>
      <div class="flex flex-wrap gap-2">
        {#each data.data.candidates as cand}
          <span class="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full">
            {cand}
          </span>
        {/each}
      </div>
    </div>
  {/if}
  
  <div class="flex justify-end space-x-3">
    {#if data.type === 'forced'}
      <button class="btn btn-primary" on:click={handleApply}>自动填入</button>
    {/if}
    <button class="btn" on:click={hideModal}>关闭</button>
  </div>
</div>