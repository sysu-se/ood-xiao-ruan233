<script>
  export let data = {};
  export let hideModal;
</script>

<div>
  <h1 class="text-2xl font-semibold mb-4">{data.title || '提示'}</h1>
  <p class="mb-6 text-lg">{data.message}</p>
  <div class="flex justify-end">
    <button class="btn btn-primary" on:click={hideModal}>确定</button>
  </div>
</div>