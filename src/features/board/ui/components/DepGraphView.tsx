import React, { useMemo } from "react";
import { Task, PhaseId, PHASES } from "@/types/structure";

interface DepGraphViewProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
  activeId: string | null;
}

/**
 * タスク間の依存関係をSVGグラフで可視化するコンポーネント
 */
export function DepGraphView({ tasks, onSelect, activeId }: DepGraphViewProps) {
  const { nodes, edges } = useMemo(() => {
    // フェーズ順序のマッピング
    const phaseOrder: Record<PhaseId, number> = {
      INBOX: 0, SPEC: 1, BUILD: 2, AUDIT: 3, DONE: 4
    };

    // フェーズ別にタスクをグループ化
    const tasksByPhase: Record<PhaseId, Task[]> = {
      INBOX: [], SPEC: [], BUILD: [], AUDIT: [], DONE: []
    };
    
    tasks.forEach(task => {
      tasksByPhase[task.phase].push(task);
    });

    // ノード位置を計算
    const nodes = tasks.map((task) => {
      const phaseIndex = phaseOrder[task.phase];
      const tasksInPhase = tasksByPhase[task.phase];
      const indexInPhase = tasksInPhase.indexOf(task);
      
      return {
        id: task.id,
        task,
        x: 80 + phaseIndex * 200,
        y: 80 + indexInPhase * 80,
      };
    });

    // ノードマップを作成（依存関係検索用）
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    // エッジを計算
    const edges = tasks.flatMap(task =>
      task.deps
        .filter(depId => nodeMap[depId])
        .map(depId => ({
          from: depId,
          to: task.id,
          fromNode: nodeMap[depId],
          toNode: nodeMap[task.id],
        }))
    );

    return { nodes, edges };
  }, [tasks]);

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="text-sm font-medium">Dependency Graph</div>
        <div className="text-xs opacity-70 mt-1">Click nodes to select tasks</div>
      </div>
      
      <div className="p-2">
        <svg 
          className="w-full h-[500px]" 
          viewBox="0 0 1000 500"
          style={{ background: 'transparent' }}
        >
          {/* フェーズガイドライン */}
          {PHASES.map((phase, index) => (
            <g key={phase.id}>
              <line
                x1={80 + index * 200}
                y1={20}
                x2={80 + index * 200}
                y2={480}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="2,2"
              />
              <text
                x={80 + index * 200}
                y={15}
                className="text-xs fill-neutral-400"
                textAnchor="middle"
              >
                {phase.label}
              </text>
            </g>
          ))}

          {/* 依存関係の矢印マーカー定義 */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                className="fill-neutral-500"
              />
            </marker>
          </defs>
          
          {/* 依存関係のエッジ */}
          {edges.map((edge, index) => (
            <line
              key={index}
              x1={edge.fromNode.x + 80}
              y1={edge.fromNode.y + 20}
              x2={edge.toNode.x}
              y2={edge.toNode.y + 20}
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
            />
          ))}

          {/* タスクノード */}
          {nodes.map((node) => (
            <g key={node.id}>
              {/* ノードの背景矩形 */}
              <rect
                x={node.x}
                y={node.y}
                width="160"
                height="40"
                rx="8"
                ry="8"
                className={`stroke-neutral-700 cursor-pointer transition-colors ${
                  activeId === node.id
                    ? "fill-neutral-700 stroke-neutral-500"
                    : "fill-neutral-800/80 hover:fill-neutral-700"
                }`}
                onClick={() => onSelect(node.task)}
              />
              
              {/* タスクID表示 */}
              <text
                x={node.x + 8}
                y={node.y + 16}
                className="text-xs fill-neutral-100 font-mono pointer-events-none"
              >
                {node.task.id}
              </text>
              
              {/* タスクタイトル表示（切り詰め） */}
              <text
                x={node.x + 8}
                y={node.y + 32}
                className="text-xs fill-neutral-300 pointer-events-none"
              >
                {node.task.title.slice(0, 20)}
                {node.task.title.length > 20 ? "..." : ""}
              </text>
              
              {/* オーナーバッジ */}
              <rect
                x={node.x + 130}
                y={node.y + 4}
                width="24"
                height="14"
                rx="2"
                ry="2"
                className={`${
                  node.task.owner === "AI" 
                    ? "fill-indigo-900/80" 
                    : "fill-amber-900/60"
                }`}
              />
              <text
                x={node.x + 142}
                y={node.y + 13}
                className="text-[10px] fill-neutral-100 pointer-events-none"
                textAnchor="middle"
              >
                {node.task.owner.slice(0, 2)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}