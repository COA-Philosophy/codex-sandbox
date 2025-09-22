-- Stage 3: 冪等性 + 監査ログテーブル作成
-- 作成日: 2025-09-20
-- 目的: MCP Orchestra基盤の品質向上

-- 冪等性管理テーブル
CREATE TABLE IF NOT EXISTS orchestra_idempotency (
  tool text NOT NULL,
  key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  response jsonb NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (tool, key)
);

-- 冪等性キーの自動削除用インデックス
CREATE INDEX IF NOT EXISTS idx_orchestra_idempotency_expires 
ON orchestra_idempotency (expires_at);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS orchestra_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  request_id text,
  agent_id text,
  session_id text,
  tool text,
  level text CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb
);

-- ログ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_orchestra_logs_request_id 
ON orchestra_logs (request_id);

CREATE INDEX IF NOT EXISTS idx_orchestra_logs_tool_level 
ON orchestra_logs (tool, level);

CREATE INDEX IF NOT EXISTS idx_orchestra_logs_created_at 
ON orchestra_logs (created_at DESC);

-- コメント追加
COMMENT ON TABLE orchestra_idempotency IS 'MCP Tools冪等性管理テーブル';
COMMENT ON TABLE orchestra_logs IS 'MCP Orchestra統一監査ログテーブル';