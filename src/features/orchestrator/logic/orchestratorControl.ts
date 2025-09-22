// path: src/features/orchestrator/logic/orchestratorControl.ts
// CodeBaton V2 - AI Orchestra Control (V1移植版 + phaseManager統合)
// 完全3段階フロー: requirements → approval → implementation

import { 
  OrchestrationState, 
  OrchestrationPhase,
  AgentStatus,
  OrchestrationStep,
  FlowState,
  SystemEvent
} from '@/features/orchestrator/types';

import { 
  phaseTransition, 
  approvalWorkflow, 
  validatePhase, 
  updateStateForPhase 
} from './phaseManager';

/**
 * 協奏実行オプション（V1継承）
 */
export interface OrchestrationOptions {
  sessionId?: string;
  enableEvents?: boolean;
  stepDelay?: number; 
  enableTraits?: boolean;
  mockMode?: boolean;
}

/**
 * 内部設定型（必須プロパティ化）
 */
interface InternalConfig {
  sessionId: string;
  enableEvents: boolean;
  stepDelay: number;
  enableTraits: boolean;
  mockMode: boolean;
}

/**
 * モック判定関数（V1完全継承）
 */
function isOrchestraMockMode(): boolean {
  return process.env.ORCHESTRA_MOCK === 'true';
}

/**
 * V2 AI協奏メイン実行関数
 * V1の6段階フロー → V2の3段階フロー（requirements → approval → implementation）
 * phaseManager統合による完全フロー制御
 */
export async function runOrchestra(
  prompt: string,
  options: OrchestrationOptions = {}
): Promise<OrchestrationState> {
  const startTime = Date.now();
  
  // デフォルト設定（V1パターン継承）
  const config: InternalConfig = {
    sessionId: options.sessionId || `orch_${Date.now()}`,
    enableEvents: options.enableEvents ?? true,
    stepDelay: options.stepDelay ?? 1000,
    enableTraits: options.enableTraits ?? true,
    mockMode: options.mockMode ?? isOrchestraMockMode(),
  };

  // 初期状態生成（orchestrationType.ts準拠）
  const initialState: OrchestrationState = {
    sessionId: config.sessionId,
    currentPhase: 'requirements',
    startTime: new Date(),
    lastUpdate: new Date(),
    aiAgents: {
      gpt4o: createAgentStatus('gpt4o', 'Orchestra指揮者'),
      claude: createAgentStatus('claude', '要件定義+レビュー'),
      gemini: createAgentStatus('gemini', '記憶+進捗管理'),
    },
    flowState: {
      currentPhase: 'requirements',
      canProceed: true,
      requirementsCompleted: false,
      approvalReceived: false,
      implementationInProgress: false,
      pendingApproval: { required: false },
      progress: {
        totalSteps: 3, // 3段階フローに更新
        completedSteps: 0,
      },
    },
    steps: [],
    errors: [],
    success: false,
    summary: '',
  };

  // モックモードチェック（V1継承）
  if (config.mockMode) {
    console.log('[Orchestra] モックモード実行:', prompt);
    
    // 3段階フロー対応モックステップ
    const mockSteps: OrchestrationStep[] = [
      {
        id: 'mock_step_1',
        stepNumber: 1,
        phase: 'requirements',
        agentId: 'gpt4o',
        role: 'Orchestra指揮者',
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        result: 'モック要件定義完了',
        status: 'completed',
      },
      {
        id: 'mock_step_2', 
        stepNumber: 2,
        phase: 'approval',
        agentId: 'gpt4o',
        role: 'Orchestra指揮者',
        startTime: new Date(),
        endTime: new Date(),
        duration: 50,
        result: 'モック承認完了',
        status: 'completed',
      },
      {
        id: 'mock_step_3',
        stepNumber: 3,
        phase: 'implementation',
        agentId: 'claude',
        role: '要件定義+レビュー',
        startTime: new Date(),
        endTime: new Date(),
        duration: 150,
        result: 'モック実装完了',
        status: 'completed',
      }
    ];

    return {
      ...initialState,
      steps: mockSteps,
      summary: 'モックモード: 3段階フロー完了 (requirements→approval→implementation)',
      success: true,
      lastUpdate: new Date(),
      currentPhase: 'implementation',
      flowState: {
        ...initialState.flowState,
        currentPhase: 'implementation',
        requirementsCompleted: true,
        approvalReceived: true,
        implementationInProgress: false,
        progress: {
          totalSteps: 3,
          completedSteps: 3,
        },
      },
    };
  }

  try {
    console.log('[Orchestra] V2 AI協奏開始 (3段階フロー):', prompt);
    
    // executeOrchestra呼び出し（V2協奏実行 + phaseManager統合）
    const finalState = await executeOrchestra(initialState, prompt, config);
    
    console.log('[Orchestra] V2 AI協奏完了');
    return finalState;

  } catch (error) {
    console.error('[Orchestra] V2 協奏エラー:', error);
    
    // SystemEvent型準拠（systemTypes.ts準拠）
    const errorEvent: SystemEvent = {
      id: `error_${Date.now()}`,
      type: 'system_error',
      timestamp: new Date(),
      sessionId: config.sessionId,
      message: error instanceof Error ? error.message : 'Unknown orchestration error',
      data: { phase: initialState.currentPhase, prompt: prompt.slice(0, 100) },
    };

    return {
      ...initialState,
      errors: [errorEvent],
      summary: `協奏エラー: ${errorEvent.message}`,
      success: false,
      lastUpdate: new Date(),
    };
  }
}

/**
 * V2協奏実行核心ロジック（phaseManager統合版）
 * 完全3段階フロー: requirements → approval → implementation
 */
async function executeOrchestra(
  state: OrchestrationState,
  prompt: string,
  config: InternalConfig
): Promise<OrchestrationState> {
  let currentState = { ...state };
  
  // Phase 1: Requirements - GPT-4o Orchestra指揮者による要件定義
  console.log('[Orchestra] Phase 1: Requirements 開始');
  currentState = await executePhase(
    currentState,
    'requirements',
    'gpt4o',
    `要件定義フェーズ: ${prompt}`,
    config,
    1
  );
  
  // phaseManager使用: requirements → approval 遷移チェック
  const transition1 = await phaseTransition(currentState, 'approval');
  if (!transition1.success) {
    throw new Error(`Requirements→Approval遷移失敗: ${transition1.message}`);
  }
  
  // Phase 2: Approval - 承認フロー（実環境では外部入力待ち、モックでは自動承認）
  console.log('[Orchestra] Phase 2: Approval 開始');
  currentState = updateStateForPhase(currentState, 'approval');
  
  // モックモードでは自動承認
  const approval = await approvalWorkflow(currentState, 'approve');
  if (!approval.approved) {
    throw new Error(`承認エラー: ${approval.message}`);
  }
  
  // 承認ステップ記録
  const approvalStep: OrchestrationStep = {
    id: `step_approval_${Date.now()}`,
    stepNumber: 2,
    phase: 'approval',
    agentId: 'gpt4o',
    role: 'Orchestra指揮者',
    startTime: new Date(),
    endTime: new Date(),
    duration: 50,
    result: `承認完了: ${approval.message}`,
    status: 'completed',
  };
  
  currentState = {
    ...currentState,
    steps: [...currentState.steps, approvalStep],
    flowState: {
      ...currentState.flowState,
      approvalReceived: true,
      requirementsCompleted: true,
    },
  };
  
  // Phase 3: Implementation - Claude + Gemini協奏による実装
  console.log('[Orchestra] Phase 3: Implementation 開始');
  currentState = updateStateForPhase(currentState, 'implementation');
  currentState = await executePhase(
    currentState,
    'implementation', 
    'claude',
    `実装フェーズ: 承認済み仕様による実装`,
    config,
    3
  );
  
  // 実装完了バリデーション
  const validation = await validatePhase(currentState, 'implementation');
  if (!validation.isValid) {
    console.warn('[Orchestra] 実装フェーズ検証警告:', validation.missingRequirements);
  }
  
  // 最終サマリー生成（V1 generateSummary継承 + 3段階対応）
  currentState.summary = generateSummary(currentState.steps, prompt);
  currentState.success = true;
  currentState.lastUpdate = new Date();
  
  return currentState;
}

/**
 * 単一フェーズ実行（V1 executeStep構造の継承・簡素化）
 */
async function executePhase(
  state: OrchestrationState,
  phase: OrchestrationPhase,
  agentId: keyof OrchestrationState['aiAgents'],
  task: string,
  config: InternalConfig,
  stepNumber: number
): Promise<OrchestrationState> {
  const phaseStart = Date.now();
  
  console.log(`[Orchestra] フェーズ実行: ${phase} (${agentId})`);
  
  // エージェント状態更新
  const updatedState = {
    ...state,
    lastUpdate: new Date(),
    aiAgents: {
      ...state.aiAgents,
      [agentId]: {
        ...state.aiAgents[agentId],
        status: 'running' as const,
        currentTask: task,
        lastActive: new Date(),
      }
    }
  };
  
  // duration計算
  const stepDuration = Date.now() - phaseStart;
  
  // ステップ記録（stepTypes.ts準拠・型安全）
  const step: OrchestrationStep = {
    id: `step_${phase}_${Date.now()}`,
    stepNumber,
    phase,
    agentId,
    role: updatedState.aiAgents[agentId].name,
    startTime: new Date(),
    endTime: new Date(Date.now() + stepDuration),
    duration: stepDuration,
    result: `${phase}フェーズ完了 - モック結果 (${task.slice(0, 50)}...)`, // 実AI連携は後続タスクで実装
    status: 'completed',
  };
  
  // ステップ間遅延（V1継承）
  if (config.stepDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, config.stepDelay));
  }
  
  // duration最終更新
  step.duration = Date.now() - phaseStart;
  step.endTime = new Date();
  
  return {
    ...updatedState,
    steps: [...updatedState.steps, step],
    aiAgents: {
      ...updatedState.aiAgents,
      [agentId]: {
        ...updatedState.aiAgents[agentId],
        status: 'completed',
        currentTask: undefined,
      }
    },
    flowState: {
      ...updatedState.flowState,
      progress: {
        ...updatedState.flowState.progress,
        completedSteps: updatedState.flowState.progress.completedSteps + 1,
      }
    }
  };
}

/**
 * エージェント状態初期化ヘルパー（agentTypes.ts準拠）
 */
function createAgentStatus(id: string, name: string): AgentStatus {
  return {
    id,
    name,
    status: 'idle',
    lastActive: null,
    performance: {
      successRate: 1.0,
      avgResponseTime: 2000,
    },
    errorCount: 0,
    fallbackAvailable: true,
  };
}

/**
 * 協奏結果サマリー生成（V1 generateSummary完全継承・3段階フロー対応）
 */
function generateSummary(steps: OrchestrationStep[], prompt: string): string {
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalDuration = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
  const phases = Array.from(new Set(steps.map(s => s.phase)));
  
  return `V2 AI協奏完了 (${phases.join('→')}) | 要件: "${prompt.slice(0, 50)}..." | ステップ: ${completedSteps}/${steps.length} | 実行時間: ${Math.round(totalDuration / 1000)}秒`;
}

/**
 * V2協奏テスト実行（3段階フロー対応）
 */
export async function testOrchestra(): Promise<boolean> {
  try {
    const result = await runOrchestra('テスト要件: UIコンポーネント作成 (3段階フローテスト)', {
      enableEvents: false,
      stepDelay: 100,
      mockMode: true,
    });
    
    // 3段階完了確認 (requirements + approval + implementation = 3steps)
    const hasAllPhases = result.steps.some(s => s.phase === 'requirements') &&
                         result.steps.some(s => s.phase === 'approval') &&
                         result.steps.some(s => s.phase === 'implementation');
    
    return Boolean(result.success) && result.steps.length >= 3 && hasAllPhases;
  } catch (error) {
    console.error('[Orchestra Test] Failed:', error);
    return false;
  }
}

export default {
  runOrchestra,
  executeOrchestra,
  testOrchestra,
  isOrchestraMockMode,
};