# 设计文档

## 一、提示功能实现

### 1.1 如何实现提示功能？

提示功能分两类，通过 Sudoku 类提供基础计算能力，Game 类作为对外接口：

**候选提示**

- 用户先选中一个格子，点击候选提示按钮
- 系统调用 `userGrid.getPossibleCandidates($cursor)` 获取该格子的候选数
- 弹窗显示：`格子 (x, y) 的候选数是: [a, b, c]`

**下一步提示**

- 用户直接点击下一步提示按钮
- 系统调用 `userGrid.getHintInfo()` 分析整个棋盘
- 优先返回唯一候选数，否则返回候选数最少的格子
- 弹窗显示提示信息，并当只有唯一候选数时提供“自动填入”选项

**自动填入提示**

- 用户点击自动填入按钮
- 系统调用 `userGrid.applyHint($cursor)`，通过求解器获取正确答案并直接填入
- 消耗 hints 次数

```javascript
// Sudoku.js - 核心提示方法
getPossibleCandidates(row, col)   // 计算格子候选数
getForcedMove()                   // 查找唯一候选数
getHint()                         // 返回最佳提示（优先唯一候选数）
```

### 1.2 提示能力属于 Sudoku 还是 Game？为什么？

**提示能力属于 Sudoku**

原因：
- 提示基于数独规则（行、列、宫的约束），这是数独领域的核心能力，与游戏会话状态无关
- 给定一个棋盘状态，候选数计算结果是确定的，是纯函数式计算
- Sudoku 的提示方法可以被任何需要数独计算的地方复用
- 符合领域驱动设计原则：核心业务逻辑应放在领域对象中

**协作关系：**
UI 组件 → Game.getHint() → Sudoku.getHint() → Sudoku.getForcedMove() / Sudoku.getPossibleCandidates()

## 二、探索模式实现

### 2.1 如何实现探索模式？

我选择了 **Game 创建一个临时子会话** 的方案。

具体实现：创建独立的 `Explore` 类，持有当前局面的深拷贝，拥有独立的 `History` 实例。探索过程完全隔离，可以独立进行 Undo/Redo。

**Explore 类的核心设计：**
- `_originalState`：探索起点的原始状态（深拷贝）
- `_currentSudoku`：当前探索状态（深拷贝）
- `_history`：独立的 History 实例
- `_failedPaths`：Set 记录已失败的路径，避免重复尝试
- `_parent` / `_children`：支持树状分支结构

**为什么选择这个方案？**
- 隔离性好：探索失败时可以直接丢弃整个会话，不影响主游戏
- 实现简单：不需要修改原有的 History 结构
- 符合作业要求：满足回溯到起点和独立的 Undo/Redo

### 2.2 主局面与探索局面的关系是什么？

**主局面与探索局面是复制（深拷贝）关系，不是共享关系**
- 进入探索模式时，Explore 类会通过 Sudoku.clone() 创建主局面的深拷贝，作为探索的起点
- 探索过程中的所有修改都只影响这个副本，主局面保持不变
- 提交时，将探索副本的内容复制回主局面
- 放弃时，直接丢弃探索副本，主局面不受任何影响

**为什么选择深拷贝而不是共享？**
- 探索可能失败，如果共享状态，失败后无法回退到干净状态
- 深拷贝确保探索过程完全隔离，主局面的历史记录不会被污染
- 放弃探索时只需丢弃副本，无需复杂回滚

### 2.3 history 结构是否发生了变化？

整体设计原则未变，但引入了独立历史：

| 问题 | 答案 |
|------|------|
| 探索过程是否拥有独立 history？ | 是，`Explore` 类内部有独立的 `_history` |
| 提交后如何进入主 history？ | `commitExplore()` 成功时，调用 `this._history.push()` 保存一次主历史 |
| 是否仍然使用线性栈？ | 是，主历史和探索历史都是线性栈 |
| 是否引入了树状分支？ | 是，`Explore` 支持 `_parent` / `_children` 形成树状结构 |

**树状分支结构示意：**
主游戏 (Game)
    │
    ├── Explore 分支 A (尝试 5)
    │       │
    │       ├── 子分支 A1 (尝试 3) → 失败
    │       │
    │       └── 子分支 A2 (尝试 7) → 成功
    │
    └── Explore 分支 B (尝试 9) → 放弃

## 三、Homework 1 中的设计局限

| 局限 | 说明 | 改进方向 |
|------|------|----------|
| 缺少候选数计算能力 | Sudoku 原本不提供基于规则的候选数计算 | 添加 `getPossibleCandidates()` 方法 |
| History 不支持分支 | 原本的线性历史无法直接支持分支尝试 | 引入独立的 Explore 类来隔离 |
| Game 职责边界模糊 | 原本只管理一局游戏 | 添加 `_explore` 属性管理探索子会话 |
| 提示功能缺失 | 原本没有提示相关接口 | 添加 `getHint()` 等提示方法 |

## 四、如果重做一次 Homework 1

1. **Game 设计为可扩展**
   - 预留 `_subSession` 接口，便于后续添加探索模式
   - 使用组合模式而非继承

2. **History 设计为接口**
   - 定义 `History` 接口，便于后续扩展为分支历史
   - 虽然本次没用，但为未来扩展留空间

3. **统一快照机制**
   - `saveSnapshot()` / `restoreSnapshot()` 接口
   - 便于实现任何需要回溯的功能

## 五、加分项完成情况

| 加分项 | 说明 |
|--------|------|
| 树状探索分支 | `Explore` 支持 `_parent` / `_children` |
| 探索独立 Undo/Redo | 每个分支有独立的 `_history` |
| 提示具有解释能力 | 提示信息包含原因说明 |
| 区分仅提示位置和直接填写答案 | 候选提示只显示信息；自动填入直接填答案 |
| 为探索模式提供优雅的状态建模 | 树状结构 + 失败路径记忆 |

## 六、代码结构总结
src/domain/
├── Sudoku.js // 核心领域对象：数独规则 + 提示计算
├── Game.js // 游戏会话：主历史 + 探索模式管理
├── Explore.js // 探索类：独立历史 + 树状分支 + 失败记忆
├── History.js // 历史记录：线性栈
└── index.js // 导出

src/node_modules/@sudoku/stores/
├── grid.js // 接入层：暴露领域方法给 UI
├── candidates.js // 笔记模式（独立系统）
├── hints.js // 提示次数管理
└── game.js // 游戏状态 store

src/components/
├── Controls/
│ ├── Keyboard.svelte // 键盘输入 + 笔记模式 + 探索模式
│ └── ActionBar/
│ └── Actions.svelte // 提示按钮 + 探索控制栏
└── Modal/Types/
├── Hint.svelte // 提示弹窗
├── Explore.svelte // 探索模式选择弹窗
└── Alert.svelte // 简单提示弹窗