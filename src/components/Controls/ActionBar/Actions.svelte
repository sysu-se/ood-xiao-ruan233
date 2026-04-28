<script>
  import { candidates } from '@sudoku/stores/candidates';
  import { userGrid } from '@sudoku/stores/grid';
  import { cursor } from '@sudoku/stores/cursor';
  import { hints } from '@sudoku/stores/hints';
  import { notes } from '@sudoku/stores/notes';
  import { settings } from '@sudoku/stores/settings';
  import { keyboardDisabled } from '@sudoku/stores/keyboard';
  import { gamePaused } from '@sudoku/stores/game';
  import { modal } from '@sudoku/stores/modal';

  $: hintsAvailable = $hints > 0;
  
  let exploreModeActive = false;
  let exploreFailed = false;
  
  function checkExploreStatus() {
    if (userGrid.isInExplore) {
      exploreModeActive = userGrid.isInExplore();
    }
    if (userGrid.isExploreFailed) {
      exploreFailed = userGrid.isExploreFailed();
    }
  }
  
  setInterval(checkExploreStatus, 500);

  function handleUndo() {
    if (exploreModeActive) {
      userGrid.exploreUndo?.();
    } else {
      userGrid.undo?.();
    }
    checkExploreStatus();
  }

  function handleRedo() {
    if (exploreModeActive) {
      userGrid.exploreRedo?.();
    } else {
      userGrid.redo?.();
    }
    checkExploreStatus();
  }

  // 按钮1：自动填入提示（消耗 hint 次数）
  function handleAutoHint() {
    if (hintsAvailable) {
      if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
        candidates.clear($cursor);
      }
      userGrid.applyHint($cursor);
      checkExploreStatus();
    }
  }
  
  // 按钮2：候选数提示（显示当前选中格子的候选数）
  function handleCandidateHint() {
    const candidates = userGrid.getPossibleCandidates?.($cursor);
    
    if (!$cursor || $cursor.x === null || $cursor.y === null) {
      modal.show('alert', {
        title: '候选数提示',
        message: '请先选中一个格子'
      });
      return;
    }
    
    if (candidates && candidates.length > 0) {
      modal.show('alert', {
        title: '候选数提示',
        message: `格子 (${$cursor.x + 1}, ${$cursor.y + 1}) 的候选数是: ${candidates.join(', ')}`
      });
    } else if (candidates && candidates.length === 0) {
      const cellValue = $userGrid[$cursor.y]?.[$cursor.x];
      if (cellValue !== 0) {
        modal.show('alert', {
          title: '候选数提示',
          message: `格子 (${$cursor.x + 1}, ${$cursor.y + 1}) 已有数字 ${cellValue}，没有候选数`
        });
      } else {
        modal.show('alert', {
          title: '候选数提示',
          message: `格子 (${$cursor.x + 1}, ${$cursor.y + 1}) 没有可填的数字`
        });
      }
    } else {
      modal.show('alert', {
        title: '候选数提示',
        message: '无法获取候选数，请重试'
      });
    }
  }
  
  // 按钮3：下一步提示（推定数）
  function handleForcedHint() {
    if (!userGrid.getHintInfo) return;
    const hint = userGrid.getHintInfo();
    
    if (hint && hint.hasHint) {
      if (hint.type === 'forced') {
        modal.show('hint', {
          title: '下一步提示',
          message: hint.message,
          data: hint.data,
          type: 'forced',
          onApply: () => {
            if (hint.data) {
              userGrid.set({ x: hint.data.col, y: hint.data.row }, hint.data.value);
            }
          }
        });
      } else if (hint.type === 'candidates') {
        // 显示推荐数字（候选数最少的格子）
        modal.show('alert', {
          title: '下一步提示',
          message: hint.message  // hint.message 已经包含了推荐信息
        });
      }
    } else {
      modal.show('alert', {
        title: '下一步提示',
        message: hint?.message || '没有可用的下一步提示'
      });
    }
  }
  
  function handleEnterExplore() {
    if (exploreModeActive) {
      modal.show('confirm', {
        title: '退出探索',
        text: '当前在探索模式中，放弃探索并返回主游戏？',
        button: '放弃探索',
        callback: () => {
          userGrid.abandonExplore?.();
          exploreModeActive = false;
          exploreFailed = false;
        }
      });
      return;
    }
    
    const possibleCandidates = userGrid.getPossibleCandidates?.($cursor);
    if (!possibleCandidates || possibleCandidates.length <= 1) {
      modal.show('alert', {
        title: '无法进入探索模式',
        message: '当前格子没有多个候选数，不需要探索。'
      });
      return;
    }
    
    modal.show('explore', {
      title: '进入探索模式',
      message: `当前格子有 ${possibleCandidates.length} 个候选数: ${possibleCandidates.join(', ')}`,
      candidates: possibleCandidates,
      onSelect: (value) => {
        const success = userGrid.enterExplore?.($cursor, value);
        if (success) {
          exploreModeActive = true;
          exploreFailed = false;
          userGrid.exploreSet?.($cursor, value);
        } else {
          modal.show('alert', {
            title: '进入失败',
            message: '无法进入探索模式，请重试。'
          });
        }
      }
    });
  }
  
  function handleCommitExplore() {
    if (!exploreModeActive) return;
    
    if (exploreFailed) {
      modal.show('alert', {
        title: '探索失败',
        message: '当前探索路径已失败，无法提交。请放弃探索后重试。'
      });
      return;
    }
    
    modal.show('confirm', {
      title: '提交探索结果',
      text: '确定要将探索结果应用到主游戏吗？提交后无法撤销。',
      button: '提交',
      callback: () => {
        const success = userGrid.commitExplore?.();
        if (success) {
          exploreModeActive = false;
          exploreFailed = false;
          modal.show('alert', {
            title: '提交成功',
            message: '探索结果已应用到主游戏！'
          });
        }
      }
    });
  }
  
  function handleAbandonExplore() {
    if (!exploreModeActive) return;
    
    modal.show('confirm', {
      title: '放弃探索',
      text: '确定要放弃当前探索吗？所有探索中的进度将丢失。',
      button: '放弃',
      callback: () => {
        userGrid.abandonExplore?.();
        exploreModeActive = false;
        exploreFailed = false;
      }
    });
  }
</script>

<div class="action-buttons space-x-3">
  <!-- Undo -->
  <button class="btn btn-round" disabled={$gamePaused} on:click={handleUndo} title="Undo">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  </button>

  <!-- Redo -->
  <button class="btn btn-round" disabled={$gamePaused} on:click={handleRedo} title="Redo">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
    </svg>
  </button>

  <!-- 按钮1：自动填入提示（灯泡+数字） -->
  <button class="btn btn-round btn-badge" 
    disabled={$keyboardDisabled || !hintsAvailable || $userGrid[$cursor.y]?.[$cursor.x] !== 0 || exploreModeActive || $gamePaused} 
    on:click={handleAutoHint} 
    title="自动填入提示">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
    {#if $settings.hintsLimited}
      <span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
    {/if}
  </button>

  <!-- 按钮2：候选数提示（圆圈 i）-->
  <button class="btn btn-round" 
    disabled={$gamePaused || exploreModeActive || $keyboardDisabled} 
    on:click={handleCandidateHint} 
    title="候选数提示">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>

  <!-- 按钮3：下一步提示（闪电箭头）-->
  <button class="btn btn-round" 
    disabled={$gamePaused || exploreModeActive || $keyboardDisabled} 
    on:click={handleForcedHint} 
    title="下一步提示（推定数）">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </button>

  <!-- 笔记按钮 -->
  <button class="btn btn-round btn-badge" 
    disabled={$gamePaused}
    on:click={notes.toggle} 
    title="Notes ({$notes ? 'ON' : 'OFF'})">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
    <span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
  </button>

  <!-- 探索模式按钮 -->
  <button class="btn btn-round" 
    disabled={$gamePaused} 
    on:click={handleEnterExplore} 
    title="探索模式">
    <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </button>
</div>

{#if exploreModeActive}
  <div class="explore-bar mt-3 p-2 rounded-lg flex items-center justify-between"
       class:explore-failed={exploreFailed}>
    <div class="flex items-center">
      <span class="text-sm font-semibold">
        {exploreFailed ? '探索失败' : '探索模式中'}
      </span>
    </div>
    <div class="flex space-x-2">
      <button class="btn btn-small" on:click={handleCommitExplore} disabled={exploreFailed}>
        提交
      </button>
      <button class="btn btn-small btn-outline" on:click={handleAbandonExplore}>
        放弃
      </button>
    </div>
  </div>
{/if}

<style>
  .action-buttons {
    @apply flex flex-wrap justify-evenly self-end;
  }

  .btn-badge {
    @apply relative;
  }

  .badge {
    min-height: 20px;
    min-width: 20px;
    @apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
  }

  .badge-primary {
    @apply bg-primary;
  }
  
  .explore-bar {
    @apply bg-yellow-100 border border-yellow-400;
  }
  
  .explore-failed {
    @apply bg-red-100 border-red-400;
  }
  
  .btn-outline {
    @apply bg-transparent border border-gray-400 text-gray-700;
  }
  
  .btn-outline:hover {
    @apply bg-gray-100;
  }
</style>