// path: src/features/orchestrator/types/index.ts

/**
 * V1→V2移植: AI協奏システム型定義統合エクスポート
 * C-001基本型定義完了 - 全8タスク統合
 */

// 協奏フロー基本型
export type { OrchestrationState, OrchestrationPhase } from './orchestrationTypes';

// エージェント管理型
export type { AgentStatus, AgentExecutionStatus } from './agentTypes';

// システムイベント・ログ型
export type { SystemEvent, SystemEventType } from './systemTypes';

// ステップ実行履歴型
export type { OrchestrationStep } from './stepTypes';

// フロー制御型
export type { FlowState } from './flowTypes';

// レスポンス管理型
export type { AIResponse, AIResponseStatus } from './responseTypes';

// エラー管理型
export type { OrchestrationError, ErrorCategory, ErrorSeverity } from './errorTypes';