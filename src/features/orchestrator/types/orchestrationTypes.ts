// path: src/features/orchestrator/types/orchestrationTypes.ts

/**
 * V1→V2移植: AI協奏システム基本型定義
 * V1の6段階フロー → V2の2段階フローに再設計
 * GPT-4o Orchestra指揮者パターン対応
 */

import type { AgentStatus } from './agentTypes';
import type { OrchestrationStep } from './stepTypes';
import type { SystemEvent } from './systemTypes';
import type { FlowState } from './flowTypes';

/**
 * V2: 2段階協奏フロー（V1の6段階から簡素化）
 */
export type OrchestrationPhase = 'requirements' | 'approval' | 'implementation';

/**
 * V2: AI協奏状態（V1のOrchestrationResultを基に再設計）
 */
export interface OrchestrationState {
  sessionId: string;
  currentPhase: OrchestrationPhase;
  startTime: Date;
  lastUpdate: Date;
  
  // V2: GPT-4o Orchestra指揮者 + 専門AI構成
  aiAgents: {
    gpt4o: AgentStatus;    // Orchestra指揮者（V1のAdvisor/Auditor統合）
    claude: AgentStatus;   // 要件定義+レビュー（V1のCraftsman/Refiner統合）
    gemini: AgentStatus;   // 記憶+進捗管理（V1のConductor/Checker統合）
  };
  
  // V1互換: 実行ステップ履歴（V1のsteps構造継承）
  steps: OrchestrationStep[];
  
  // V2: フロー制御状態
  flowState: FlowState;
  
  // V1継承: エラー管理
  errors: SystemEvent[];
  success?: boolean;
  summary?: string;
}

export default OrchestrationState;