import { Sudoku } from './Sudoku.js';
import { Game } from './Game.js';
import { History } from './History.js';
import { Explore } from './Explore.js';

/**
 * 创建 Sudoku 实例
 * @param {number[][]} grid - 9x9 的二维数组
 * @returns {Sudoku}
 */
export function createSudoku(grid) {
  return new Sudoku(grid);
}

/**
 * 从 JSON 恢复 Sudoku 实例
 * @param {Object} json - Sudoku.toJSON() 的输出
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}

/**
 * 创建 Game 实例
 * @param {Object} params - { sudoku: Sudoku }
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  if (!sudoku) {
    throw new Error('sudoku is required');
  }
  return new Game({ sudoku });
}

/**
 * 从 JSON 恢复 Game 实例
 * @param {Object} json - Game.toJSON() 的输出
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}

/**
 * 创建探索实例
 * @param {Sudoku} baseSudoku - 基础数独状态
 * @param {Object} exploreMove - 探索移动 {row, col, value}
 * @returns {Explore}
 */
export function createExplore(baseSudoku, exploreMove) {
  return new Explore(baseSudoku, exploreMove);
}

export { Sudoku, Game, History, Explore };