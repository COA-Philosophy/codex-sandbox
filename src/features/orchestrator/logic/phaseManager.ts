// path: src/features/orchestrator/logic/phaseManager.ts
// CodeBaton V2 - Phase Transition & Approval Flow Manager
// V1→V2移植: executeStep構造をV2の3段階フローに適応

import { 
  OrchestrationState, 
  OrchestrationPhase,
  FlowState,
  SystemEvent
} from '@/features/orchestrator/types';

/**
 * フェーズ遷移結果
 */
export interface PhaseTransitionResult {
  success: boolean;
  newPhase?: OrchestrationPhase;
  message: string;
  blockers?: string[];
  estimatedWaitTime?: number;
}

/**
 * 承認フロー結果
 */
export interface ApprovalResult {
  approved: boolean;
  message: string;
  timestamp: Date;
  timeoutAt?: Date;
}

/**
 * フェーズ完了条件検証結果
 */
export interface PhaseValidationResult {
  isValid: boolean;
  completionPercent: number;
  missingRequirements: string[];
  nextActions: string[];
}

/**
 * V2メイン機能: フェーズ遷移制御
 * V1のexecuteStep間遷移を3段階フロー対応に移植
 * requirements → approval → implementation
 */
export async function phaseTransition(
  currentState: OrchestrationState,
  targetPhase: OrchestrationPhase
): Promise<PhaseTransitionResult> {
  console.log(`[PhaseManager] フェーズ遷移開始: ${currentState.currentPhase} → ${targetPhase}`);
  
  try {
    // 現在フェーズのバリデーション
    const validation = await validatePhase(currentState, currentState.currentPhase);
    if (!validation.isValid) {
      return {
        success: false,
        message: `現在フェーズ(${currentState.currentPhase})が未完了です`,
        blockers: validation.missingRequirements,
      };
    }
    
    // 遷移可能性チェック
    const canTransition = canTransitionTo(currentState.currentPhase, targetPhase);
    if (!canTransition.allowed) {
      return {
        success: false,
        message: canTransition.reason,
        blockers: [canTransition.reason],
      };
    }
    
    // 特別処理: approval フェーズへの遷移
    if (targetPhase === 'approval') {
      return await handleApprovalTransition(currentState);
    }
    
    // 通常フェーズ遷移
    console.log(`[PhaseManager] フェーズ遷移成功: ${targetPhase}`);
    return {
      success: true,
      newPhase: targetPhase,
      message: `${targetPhase}フェーズに遷移しました`,
    };
    
  } catch (error) {
    console.error('[PhaseManager] フェーズ遷移エラー:', error);
    return {
      success: false,
      message: `遷移エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * approval フェーズ特別処理
 * V1にはなかった承認フロー管理（V2新機能）
 */
async function handleApprovalTransition(
  currentState: OrchestrationState
): Promise<PhaseTransitionResult> {
  // 承認要求の設定
  const approvalTimeout = new Date(Date.now() + 10 * 60 * 1000); // 10分後
  
  console.log('[PhaseManager] 承認フェーズ移行 - ユーザー承認待ち');
  
  return {
    success: true,
    newPhase: 'approval',
    message: '要件定義が完了しました。実装を開始してもよろしいですか？',
    estimatedWaitTime: 10 * 60 * 1000, // 10分
  };
}

/**
 * 承認フロー管理
 * ユーザー承認・拒否・タイムアウト処理
 */
export async function approvalWorkflow(
  currentState: OrchestrationState,
  userAction: 'approve' | 'reject' | 'modify',
  feedback?: string
): Promise<ApprovalResult> {
  const timestamp = new Date();
  
  try {
    console.log(`[PhaseManager] 承認処理: ${userAction}`);
    
    switch (userAction) {
      case 'approve':
        return {
          approved: true,
          message: '承認されました。実装フェーズに進みます',
          timestamp,
        };
      
      case 'reject':
        return {
          approved: false,
          message: '要件定義が拒否されました。requirements フェーズに戻ります',
          timestamp,
        };
      
      case 'modify':
        return {
          approved: false,
          message: feedback 
            ? `修正要求: ${feedback}。requirements フェーズに戻ります`
            : '修正要求されました。requirements フェーズに戻ります',
          timestamp,
        };
      
      default:
        throw new Error(`不明な承認アクション: ${userAction}`);
    }
    
  } catch (error) {
    console.error('[PhaseManager] 承認処理エラー:', error);
    return {
      approved: false,
      message: `承認処理エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp,
    };
  }
}

/**
 * フェーズ完了条件バリデーション
 * V1のステップ完了確認を3段階フロー対応に移植
 */
export async function validatePhase(
  currentState: OrchestrationState,
  phase: OrchestrationPhase
): Promise<PhaseValidationResult> {
  console.log(`[PhaseManager] フェーズ検証: ${phase}`);
  
  try {
    switch (phase) {
      case 'requirements':
        return validateRequirementsPhase(currentState);
      
      case 'approval':
        return validateApprovalPhase(currentState);
      
      case 'implementation':
        return validateImplementationPhase(currentState);
      
      default:
        return {
          isValid: false,
          completionPercent: 0,
          missingRequirements: [`不明なフェーズ: ${phase}`],
          nextActions: ['有効なフェーズを指定してください'],
        };
    }
    
  } catch (error) {
    console.error('[PhaseManager] フェーズ検証エラー:', error);
    return {
      isValid: false,
      completionPercent: 0,
      missingRequirements: [`検証エラー: ${error instanceof Error ? error.message : 'Unknown error'}`],
      nextActions: ['エラーを解決してください'],
    };
  }
}

/**
 * requirements フェーズ検証
 */
function validateRequirementsPhase(state: OrchestrationState): PhaseValidationResult {
  const missingRequirements: string[] = [];
  
  // GPT-4o Orchestra指揮者によるステップ完了確認
  const requirementSteps = state.steps.filter(s => s.phase === 'requirements');
  if (requirementSteps.length === 0) {
    missingRequirements.push('要件定義ステップが未実行');
  }
  
  // エージェント状態確認
  if (state.aiAgents.gpt4o.status !== 'completed') {
    missingRequirements.push('GPT-4o Orchestra指揮者の要件定義が未完了');
  }
  
  const completionPercent = missingRequirements.length === 0 ? 100 : 50;
  
  return {
    isValid: missingRequirements.length === 0,
    completionPercent,
    missingRequirements,
    nextActions: missingRequirements.length === 0 
      ? ['approval フェーズに遷移可能']
      : ['要件定義を完了してください'],
  };
}

/**
 * approval フェーズ検証
 */
function validateApprovalPhase(state: OrchestrationState): PhaseValidationResult {
  const missingRequirements: string[] = [];
  
  // 承認状態確認
  if (!state.flowState.approvalReceived) {
    missingRequirements.push('ユーザー承認が未完了');
  }
  
  // 承認タイムアウト確認
  if (state.flowState.pendingApproval.required && state.flowState.pendingApproval.timeoutAt) {
    const now = new Date();
    const timeout = new Date(state.flowState.pendingApproval.timeoutAt);
    if (now > timeout) {
      missingRequirements.push('承認がタイムアウトしました');
    }
  }
  
  const completionPercent = missingRequirements.length === 0 ? 100 : 0;
  
  return {
    isValid: missingRequirements.length === 0,
    completionPercent,
    missingRequirements,
    nextActions: missingRequirements.length === 0 
      ? ['implementation フェーズに遷移可能']
      : ['ユーザー承認を完了してください'],
  };
}

/**
 * implementation フェーズ検証
 */
function validateImplementationPhase(state: OrchestrationState): PhaseValidationResult {
  const missingRequirements: string[] = [];
  
  // Claude + Gemini協奏ステップ確認
  const implementationSteps = state.steps.filter(s => s.phase === 'implementation');
  if (implementationSteps.length === 0) {
    missingRequirements.push('実装ステップが未実行');
  }
  
  // Claude実装状態確認
  if (state.aiAgents.claude.status !== 'completed') {
    missingRequirements.push('Claude実装が未完了');
  }
  
  // Gemini記憶・整合性確認状態確認
  if (state.aiAgents.gemini.status === 'error') {
    missingRequirements.push('Gemini整合性チェックでエラー');
  }
  
  const completionPercent = Math.max(0, 100 - (missingRequirements.length * 25));
  
  return {
    isValid: missingRequirements.length === 0,
    completionPercent,
    missingRequirements,
    nextActions: missingRequirements.length === 0 
      ? ['協奏完了']
      : ['実装を完了してください'],
  };
}

/**
 * フェーズ遷移可能性チェック
 * V2の3段階フロー制約を実装
 */
function canTransitionTo(
  currentPhase: OrchestrationPhase,
  targetPhase: OrchestrationPhase
): { allowed: boolean; reason: string } {
  const validTransitions: Record<OrchestrationPhase, OrchestrationPhase[]> = {
    requirements: ['approval'],
    approval: ['requirements', 'implementation'], // 承認拒否時はrequirementsに戻る
    implementation: [], // 実装完了後は遷移なし
  };
  
  const allowedTargets = validTransitions[currentPhase] || [];
  
  if (allowedTargets.includes(targetPhase)) {
    return { allowed: true, reason: '遷移可能' };
  }
  
  return {
    allowed: false,
    reason: `${currentPhase} から ${targetPhase} への遷移は許可されていません。許可: [${allowedTargets.join(', ')}]`,
  };
}

/**
 * OrchestrationState更新ヘルパー
 * フェーズ遷移時の状態更新を統一
 */
export function updateStateForPhase(
  currentState: OrchestrationState,
  newPhase: OrchestrationPhase,
  additionalUpdates: Partial<OrchestrationState> = {}
): OrchestrationState {
  const timestamp = new Date();
  
  // 基本フェーズ更新
  const baseUpdates: Partial<OrchestrationState> = {
    currentPhase: newPhase,
    lastUpdate: timestamp,
    flowState: {
      ...currentState.flowState,
      currentPhase: newPhase,
    },
  };
  
  // フェーズ別特別処理
  let phaseSpecificUpdates: Partial<OrchestrationState> = {};
  
  if (newPhase === 'approval') {
    phaseSpecificUpdates = {
      flowState: {
        ...currentState.flowState,
        ...baseUpdates.flowState,
        requirementsCompleted: true,
        pendingApproval: {
          required: true,
          requestedAt: timestamp,
          timeoutAt: new Date(timestamp.getTime() + 10 * 60 * 1000), // 10分後
        },
      },
    };
  } else if (newPhase === 'implementation') {
    phaseSpecificUpdates = {
      flowState: {
        ...currentState.flowState,
        ...baseUpdates.flowState,
        approvalReceived: true,
        implementationInProgress: true,
        pendingApproval: { required: false },
      },
    };
  }
  
  return {
    ...currentState,
    ...baseUpdates,
    ...phaseSpecificUpdates,
    ...additionalUpdates,
  };
}

export default {
  phaseTransition,
  approvalWorkflow,
  validatePhase,
  updateStateForPhase,
};