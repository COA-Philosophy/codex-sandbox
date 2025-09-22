// path: app/api/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service Roleを使用してRLSをバイパス（既存testArchiveFlowと同じ動作を実現）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Response API準拠のレスポンス型
type ArchiveListResponse = {
  id: string;
  object: 'archive_list';
  created: number;
  data: any[];
  total: number;
  metadata: {
    version: string;
  };
};

type ArchiveCreateResponse = {
  id: string;
  object: 'archive_create';
  created: number;
  success: boolean;
  archiveId?: string;
  message?: string;
};

/**
 * GET /api/archive - Archive一覧取得
 * Response API準拠のArchive一覧レスポンス
 */
export async function GET() {
  try {
    console.debug('[orchestra] GET /api/archive - Archive一覧取得開始');
    
    const { data, error } = await supabase
      .from('v2_project_archives')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[orchestra] Archive一覧取得エラー:', error);
      return NextResponse.json(
        {
          error: {
            message: error.message,
            type: 'database_error',
            code: 'ARCHIVE_FETCH_FAILED',
          },
        },
        { status: 500 }
      );
    }

    const response: ArchiveListResponse = {
      id: `archive_list_${Date.now()}`,
      object: 'archive_list',
      created: Math.floor(Date.now() / 1000),
      data: data || [],
      total: data?.length || 0,
      metadata: {
        version: '15.5.0',
      },
    };

    console.debug('[orchestra] Archive一覧取得完了:', {
      count: response.total,
      requestId: response.id
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[orchestra] GET /api/archive 予期しないエラー:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Archive一覧取得に失敗しました',
          type: 'server_error',
          code: 'UNEXPECTED_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/archive - Archive作成・管理
 * アクション型に応じた処理分岐
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.debug('[orchestra] POST /api/archive - アクション実行:', { 
      action, 
      hasData: !!data 
    });

    switch (action) {
      case 'create':
        return await handleArchiveCreate(data);
        
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
    console.error('[orchestra] POST /api/archive エラー:', error);
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
 * Archive作成処理（Service Role版 - RLSバイパス）
 */
async function handleArchiveCreate(data: {
  title: string;
  structureSnapshot: any;
  summary?: string;
  tags?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
  completionDurationHours?: number | null;
}): Promise<NextResponse> {
  if (!data?.title) {
    return NextResponse.json(
      {
        error: {
          message: 'タイトルが必要です',
          type: 'validation_error',
          code: 'MISSING_TITLE',
        },
      },
      { status: 400 }
    );
  }

  if (!data?.structureSnapshot) {
    return NextResponse.json(
      {
        error: {
          message: 'structureSnapshot が必要です',
          type: 'validation_error',
          code: 'MISSING_SNAPSHOT',
        },
      },
      { status: 400 }
    );
  }

  try {
    // Service Roleで直接insert（RLS無視）
    const insertData = {
      title: data.title,
      structure_snapshot: data.structureSnapshot,
      user_id: 'd587559e-f587-4d90-b471-e34d4e470aba', // 既存testArchiveFlowと同じ
    };

    console.debug('[orchestra] Archive作成データ:', {
      title: insertData.title,
      tasksCount: insertData.structure_snapshot?.tasks?.length || 0,
      userId: insertData.user_id,
    });

    const { data: result, error } = await supabase
      .from('v2_project_archives')
      .insert(insertData)
      .select('*')
      .single();
    
    if (error) {
      console.error('[orchestra] Archive作成エラー:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      return NextResponse.json(
        {
          error: {
            message: error.message,
            type: 'database_error',
            code: 'ARCHIVE_CREATE_FAILED',
            originalError: {
              code: error.code,
              details: error.details,
              hint: error.hint
            }
          },
        },
        { status: 500 }
      );
    }

    const response: ArchiveCreateResponse = {
      id: `archive_create_${Date.now()}`,
      object: 'archive_create',
      created: Math.floor(Date.now() / 1000),
      success: true,
      archiveId: result.id,
      message: 'Archive作成完了',
    };

    console.debug('[orchestra] Archive作成成功:', {
      archiveId: result.id,
      title: result.title,
      requestId: response.id
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[orchestra] Archive作成 予期しないエラー:', error);
    return NextResponse.json(
      {
        error: {
          message: `Archive作成に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'server_error',
          code: 'UNEXPECTED_CREATE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}