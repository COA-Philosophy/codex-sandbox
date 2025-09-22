// path: app/api/board/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { useStructureStore } from '@/store/structureStore';
import { createArchiveFromBoard } from '@/features/board/logic/archiveIntegration';
import type { Task } from '@/types/structure';

// Response API準拠のレスポンス型
type BoardStateResponse = {
  id: string;
  object: 'board_state';
  created: number;
  board: {
    tasks: Task[];
    handoffs: any[];
    taskCount: number;
    isDirty: boolean;
    lastSnapshotAt: number | null;
  };
  metadata: {
    environment: string;
    version: string;
  };
};

type TaskUpdateResponse = {
  id: string;
  object: 'task_update';
  created: number;
  task: Task;
  success: boolean;
  message?: string;
};

type ArchiveCreateResponse = {
  id: string;
  object: 'archive_create';
  created: number;
  success: boolean;
  archiveId?: string;
  message?: string;
  archiveData?: any; // クライアント側保存用データ
};

/**
 * GET /api/board - Board状態取得
 * Response API準拠のBoard状態レスポンス
 */
export async function GET(request: NextRequest) {
  try {
    console.debug('[orchestra] GET /api/board - Board状態取得開始');
    
    const store = useStructureStore.getState();
    const tasks = store.tasks;
    const handoffs = store.handoffs;
    const taskCount = store.getTaskCount();
    const isDirty = store.isDirty;
    const lastSnapshotAt = store.lastSnapshotAt;

    const response: BoardStateResponse = {
      id: `board_${Date.now()}`,
      object: 'board_state',
      created: Math.floor(Date.now() / 1000),
      board: {
        tasks,
        handoffs,
        taskCount,
        isDirty,
        lastSnapshotAt,
      },
      metadata: {
        environment: 'v2',
        version: '15.5.0',
      },
    };

    console.debug('[orchestra] Board状態取得完了:', {
      taskCount,
      isDirty,
      requestId: response.id
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[orchestra] GET /api/board エラー:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Board状態取得に失敗しました',
          type: 'board_fetch_error',
          code: 'BOARD_FETCH_FAILED',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/board - タスク更新・状態変更・Archive作成
 * アクション型に応じた処理分岐
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.debug('[orchestra] POST /api/board - アクション実行:', { 
      action, 
      hasData: !!data 
    });

    switch (action) {
      case 'update_task':
        return await handleTaskUpdate(data);
        
      case 'create_archive':
        return await handleArchiveCreate(data);
        
      case 'mark_worked_now':
        return await handleMarkWorkedNow(data);
        
      case 'add_task':
        return await handleAddTask(data);
        
      case 'remove_task':
        return await handleRemoveTask(data);

      case 'stream_updates':
        return await handleStreamUpdates(request);
        
      default:
        return NextResponse.json(
          {
            error: {
              message: `未サポートのアクション: ${action}`,
              type: 'invalid_action',
              code: 'UNSUPPORTED_ACTION',
            },
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[orchestra] POST /api/board エラー:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'リクエスト処理に失敗しました',
          type: 'request_error',
          code: 'REQUEST_FAILED',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * タスク更新処理
 */
async function handleTaskUpdate(data: { 
  taskId: string; 
  updates: Partial<Task> 
}): Promise<NextResponse> {
  const { taskId, updates } = data;
  
  if (!taskId) {
    return NextResponse.json(
      {
        error: {
          message: 'taskId が必要です',
          type: 'validation_error',
          code: 'MISSING_TASK_ID',
        },
      },
      { status: 400 }
    );
  }

  const store = useStructureStore.getState();
  const existingTask = store.getTask(taskId);
  
  if (!existingTask) {
    return NextResponse.json(
      {
        error: {
          message: `タスクが見つかりません: ${taskId}`,
          type: 'not_found',
          code: 'TASK_NOT_FOUND',
        },
      },
      { status: 404 }
    );
  }

  try {
    await store.updateTask(taskId, updates);
    const updatedTask = store.getTask(taskId);

    const response: TaskUpdateResponse = {
      id: `task_update_${Date.now()}`,
      object: 'task_update',
      created: Math.floor(Date.now() / 1000),
      task: updatedTask!,
      success: true,
    };

    console.debug('[orchestra] タスク更新完了:', {
      taskId,
      updates: Object.keys(updates),
      requestId: response.id
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: `タスク更新に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'update_error',
          code: 'TASK_UPDATE_FAILED',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Archive作成処理（ハイブリッドアプローチ）
 */
async function handleArchiveCreate(data?: { title?: string }): Promise<NextResponse> {
  try {
    const archiveData = createArchiveFromBoard();
    
    if (!archiveData) {
      return NextResponse.json(
        {
          error: {
            message: 'Archiveするデータがありません',
            type: 'no_data',
            code: 'NO_ARCHIVE_DATA',
          },
        },
        { status: 400 }
      );
    }

    // タイトルをカスタマイズ可能
    if (data?.title) {
      archiveData.title = data.title;
    }

    const response: ArchiveCreateResponse = {
      id: `archive_create_${Date.now()}`,
      object: 'archive_create',
      created: Math.floor(Date.now() / 1000),
      success: true,
      message: 'Archive作成データ準備完了。クライアント側で保存実行してください。',
      archiveData, // クライアント側での保存用データ
    };

    console.debug('[orchestra] Archive作成データ準備完了:', {
      title: archiveData.title,
      taskCount: archiveData.structureSnapshot.tasks.length,
      requestId: response.id
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: `Archive作成に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'archive_error',
          code: 'ARCHIVE_CREATE_FAILED',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 作業時刻マーク処理
 */
async function handleMarkWorkedNow(data: { taskId: string }): Promise<NextResponse> {
  const { taskId } = data;
  
  if (!taskId) {
    return NextResponse.json(
      {
        error: {
          message: 'taskId が必要です',
          type: 'validation_error',
          code: 'MISSING_TASK_ID',
        },
      },
      { status: 400 }
    );
  }

  const store = useStructureStore.getState();
  store.markWorkedNow(taskId);

  const response: TaskUpdateResponse = {
    id: `mark_worked_${Date.now()}`,
    object: 'task_update', 
    created: Math.floor(Date.now() / 1000),
    task: store.getTask(taskId)!,
    success: true,
  };

  return NextResponse.json(response);
}

/**
 * タスク追加処理
 */
async function handleAddTask(data: { task: Omit<Task, 'id'> }): Promise<NextResponse> {
  const { task: taskData } = data;
  
  if (!taskData?.title) {
    return NextResponse.json(
      {
        error: {
          message: 'タスクタイトルが必要です',
          type: 'validation_error',
          code: 'MISSING_TASK_TITLE',
        },
      },
      { status: 400 }
    );
  }

  const store = useStructureStore.getState();
  const newTask = store.addTask(taskData);

  const response: TaskUpdateResponse = {
    id: `task_add_${Date.now()}`,
    object: 'task_update',
    created: Math.floor(Date.now() / 1000),
    task: newTask,
    success: true,
  };

  return NextResponse.json(response);
}

/**
 * タスク削除処理
 */
async function handleRemoveTask(data: { taskId: string }): Promise<NextResponse> {
  const { taskId } = data;
  
  if (!taskId) {
    return NextResponse.json(
      {
        error: {
          message: 'taskId が必要です',
          type: 'validation_error', 
          code: 'MISSING_TASK_ID',
        },
      },
      { status: 400 }
    );
  }

  const store = useStructureStore.getState();
  store.removeTask(taskId);

  return NextResponse.json({
    id: `task_remove_${Date.now()}`,
    object: 'task_update',
    created: Math.floor(Date.now() / 1000),
    success: true,
    message: `タスク ${taskId} を削除しました`,
  });
}

/**
 * ストリーミング更新処理（Response API準拠）
 */
async function handleStreamUpdates(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      console.debug('[orchestra] ストリーミング開始');
      
      // 初期状態送信
      const store = useStructureStore.getState();
      const initialState = {
        type: 'board_state',
        data: {
          tasks: store.tasks,
          taskCount: store.getTaskCount(),
          isDirty: store.isDirty,
        },
        timestamp: Date.now(),
      };
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialState)}\n\n`)
      );
      
      // 定期的な状態更新（簡易実装）
      const interval = setInterval(() => {
        const currentStore = useStructureStore.getState();
        const update = {
          type: 'board_update',
          data: {
            taskCount: currentStore.getTaskCount(),
            isDirty: currentStore.isDirty,
            lastSnapshotAt: currentStore.lastSnapshotAt,
          },
          timestamp: Date.now(),
        };
        
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
        );
      }, 5000);

      // クリーンアップ
      request.signal.addEventListener('abort', () => {
        console.debug('[orchestra] ストリーミング終了');
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}