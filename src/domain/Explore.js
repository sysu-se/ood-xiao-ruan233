/**
 * 探索类
 * 负责管理一次探索尝试的完整流程
 * 
 * @module Explore
 */

import { History } from './History.js';

export class Explore {
  /**
   * 创建一个新的探索实例
   * 
   * @param {Sudoku} baseSudoku - 探索起点的数独状态
   * @param {Object} exploreMove - 探索的初始尝试 { row, col, value }
   * @param {Explore} [parent=null] - 父探索分支
   */
  constructor(baseSudoku, exploreMove, parent = null) {
    if (!baseSudoku || typeof baseSudoku.clone !== 'function') {
      throw new Error('Explore: baseSudoku must be a Sudoku instance');
    }
    
    const { row, col, value } = exploreMove;
    if (!Number.isInteger(row) || row < 0 || row > 8) {
      throw new Error(`Explore: invalid row ${row}`);
    }
    if (!Number.isInteger(col) || col < 0 || col > 8) {
      throw new Error(`Explore: invalid col ${col}`);
    }
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      throw new Error(`Explore: invalid value ${value}`);
    }
    
    //深拷贝起点状态
    this._originalState = baseSudoku.clone();
    //当前探索状态
    this._currentSudoku = baseSudoku.clone();
    //探索中的操作有自己独立的历史
    this._history = new History();
    //探索的初始尝试
    this._exploreMove = { row, col, value };
    //状态标志
    this._isCommitted = false;  //是否已提交
    this._isAbandoned = false;  //是否已放弃
    //失败路径记忆（避免重复尝试）
    this._failedPaths = new Set();
    //树状分支
    this._parent = parent;    //父分支
    this._children = [];      //子分支列表
    this._activeChild = null; //当前激活的子分支
    this._depth = parent ? parent.getDepth() + 1 : 0;
    
    //执行初次尝试
    this._history.push(this._currentSudoku.clone());
    this._currentSudoku.guess(row, col, value);
  }

  getDepth() { return this._depth; }
  getParent() { return this._parent; }
  getChildren() { return this._children; }
  getActiveChild() { return this._activeChild; }

  /**
   * 创建子探索分支
   */
  createChildBranch(exploreMove) {
    if (this._isCommitted || this._isAbandoned) return null;
    
    const { row, col, value } = exploreMove;
    if (!this._currentSudoku.canGuess(row, col, value)) return null;
    
    try {
      const child = new Explore(this._currentSudoku, exploreMove, this);
      this._children.push(child);
      this._activeChild = child;
      return child;
    } catch (err) {
      return null;
    }
  }

  /**
   * 返回父分支
   */
  backToParent() {
    if (this._parent) return this._parent;
    return this;
  }

  /**
   * 在探索模式下填入数字
   */
  guess(row, col, value) {
    //如果有激活的子分支，委托给子分支
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.guess(row, col, value);
    }
    
    //检查会话状态
    if (this._isCommitted) {
      return { success: false, reason: 'explore_already_committed' };
    }
    if (this._isAbandoned) {
      return { success: false, reason: 'explore_already_abandoned' };
    }
    
    //检查参数有效性
    if (!Number.isInteger(row) || row < 0 || row > 8) {
      return { success: false, reason: 'invalid_row' };
    }
    if (!Number.isInteger(col) || col < 0 || col > 8) {
      return { success: false, reason: 'invalid_col' };
    }
    if (!Number.isInteger(value) || value < 0 || value > 9) {
      return { success: false, reason: 'invalid_value' };
    }
    
    //检查当前状态是否已在失败路径中
    const currentStateKey = this._getStateKey();
    if (this._failedPaths.has(currentStateKey)) {
      return { 
        success: false, 
        reason: 'path_already_failed',
        message: '这条路径之前已经探索过并失败了，请尝试其他选择'
      };
    }
    
    //检查是否可以填入
    if (!this._currentSudoku.canGuess(row, col, value)) {
      if (this._currentSudoku.isFixed(row, col)) {
        return { success: false, reason: 'cell_is_fixed' };
      }
      return { success: false, reason: 'conflict' };
    }
    
    //保存历史并执行
    this._history.push(this._currentSudoku.clone());
    const success = this._currentSudoku.guess(row, col, value);
    return { success, reason: success ? null : 'unknown_error' };
  }

  /**
   * 生成状态唯一标识
   */
  _getStateKey() {
    const grid = this._currentSudoku.getGrid();
    return grid.map(row => row.join(',')).join('|');
  }

  /**
   * 标记失败路径
   */
  markCurrentPathAsFailed() {
    const stateKey = this._getStateKey();
    this._failedPaths.add(stateKey);
  }

  isCurrentPathFailed() {
    const stateKey = this._getStateKey();
    return this._failedPaths.has(stateKey);
  }

  isFailed() {
    if (!this._currentSudoku.isValid()) {
      if (!this.isCurrentPathFailed()) {
        this.markCurrentPathAsFailed();
      }
      return true;
    }
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.isFailed();
    }
    return false;
  }

  undo() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.undo();
    }
    if (this._isCommitted || this._isAbandoned) return false;
    if (!this._history.canUndo()) return false;
    
    const previousState = this._history.undo(this._currentSudoku);
    if (previousState) {
      this._currentSudoku = previousState;
      return true;
    }
    return false;
  }

  redo() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.redo();
    }
    if (this._isCommitted || this._isAbandoned) return false;
    if (!this._history.canRedo()) return false;
    
    const nextState = this._history.redo(this._currentSudoku);
    if (nextState) {
      this._currentSudoku = nextState;
      return true;
    }
    return false;
  }

  isComplete() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.isComplete();
    }
    return this._currentSudoku.isComplete();
  }

  getGrid() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.getGrid();
    }
    return this._currentSudoku.getGrid();
  }

  getSudoku() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.getSudoku();
    }
    return this._currentSudoku;
  }

  /**
  * 提交探索结果
  */
  commit() {
    if (this._isCommitted || this._isAbandoned) return null;
    
    // 如果有子分支，先提交子分支
    if (this._activeChild && this._activeChild.isActive()) {
      const childResult = this._activeChild.commit();
      if (childResult) {
        this._currentSudoku = childResult;
        this._activeChild = null;
      }
    }
    
    if (this.isFailed()) return null;
    
    this._isCommitted = true;
    return this._currentSudoku.clone();
  }

  /**
  * 放弃探索
  */
  abandon() {
    if (this._isAbandoned) return this._originalState.clone();
    
    //放弃所有子分支
    for (const child of this._children) {
      child.abandon();
    }
    this._children = [];
    this._activeChild = null;
    
    this._isAbandoned = true;
    return this._originalState.clone();
  }

  isActive() {
    return !this._isCommitted && !this._isAbandoned;
  }

  canUndo() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.canUndo();
    }
    return this.isActive() && this._history.canUndo();
  }

  canRedo() {
    if (this._activeChild && this._activeChild.isActive()) {
      return this._activeChild.canRedo();
    }
    return this.isActive() && this._history.canRedo();
  }
  
  isCommitted() { return this._isCommitted; }
  isAbandoned() { return this._isAbandoned; }
  getFailedPathsCount() { return this._failedPaths.size; }
  
  getBranchTree() {
    return {
      depth: this._depth,
      move: this._exploreMove,
      isActive: this.isActive(),
      isFailed: this.isFailed(),
      childCount: this._children.length,
      children: this._children.map(c => c.getBranchTree())
    };
  }
}