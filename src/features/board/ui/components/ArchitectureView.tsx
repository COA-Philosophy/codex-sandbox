// path: src/features/board/ui/components/ArchitectureView.tsx
import React from 'react';
import { Card } from '@/components/ui/Card';

/**
 * システムアーキテクチャの概要図を表示するコンポーネント
 * CodeBaton v2の主要モジュール間の関係を可視化
 */
export function ArchitectureView() {
  return (
    <Card className="border-neutral-800 bg-neutral-900/60 p-6">
      <div className="text-sm mb-4">System Architecture Overview</div>
      
      <svg className="w-full h-[400px]" viewBox="0 0 800 400">
        <defs>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="currentColor" className="text-neutral-500" />
          </marker>
        </defs>

        {/* Session Layer */}
        <g>
          <rect
            x="50"
            y="50"
            width="200"
            height="80"
            rx="12"
            className="fill-blue-900/40 stroke-blue-600"
            strokeWidth="1"
          />
          <text x="150" y="80" textAnchor="middle" className="text-sm fill-neutral-100 font-medium">
            Session (UI)
          </text>
          <text x="150" y="100" textAnchor="middle" className="text-xs fill-neutral-300">
            Chat · PromptForm · MessageBubble
          </text>
          <text x="150" y="115" textAnchor="middle" className="text-xs fill-neutral-400">
            React Components
          </text>
        </g>

        {/* Orchestrator Layer */}
        <g>
          <rect
            x="300"
            y="50"
            width="200"
            height="80"
            rx="12"
            className="fill-emerald-900/40 stroke-emerald-600"
            strokeWidth="1"
          />
          <text x="400" y="80" textAnchor="middle" className="text-sm fill-neutral-100 font-medium">
            Orchestrator (Logic)
          </text>
          <text x="400" y="100" textAnchor="middle" className="text-xs fill-neutral-300">
            AI Coordination · Quality Gates
          </text>
          <text x="400" y="115" textAnchor="middle" className="text-xs fill-neutral-400">
            Claude · GPT · Gemini
          </text>
        </g>

        {/* StructureBoard Layer */}
        <g>
          <rect
            x="550"
            y="50"
            width="200"
            height="80"
            rx="12"
            className="fill-purple-900/40 stroke-purple-600"
            strokeWidth="1"
          />
          <text x="650" y="80" textAnchor="middle" className="text-sm fill-neutral-100 font-medium">
            StructureBoard
          </text>
          <text x="650" y="100" textAnchor="middle" className="text-xs fill-neutral-300">
            Task Management · Visualization
          </text>
          <text x="650" y="115" textAnchor="middle" className="text-xs fill-neutral-400">
            Kanban · Tree · DepGraph
          </text>
        </g>

        {/* PRD Layer */}
        <g>
          <rect
            x="175"
            y="180"
            width="200"
            height="80"
            rx="12"
            className="fill-amber-900/40 stroke-amber-600"
            strokeWidth="1"
          />
          <text x="275" y="210" textAnchor="middle" className="text-sm fill-neutral-100 font-medium">
            PRD Generation
          </text>
          <text x="275" y="230" textAnchor="middle" className="text-xs fill-neutral-300">
            3-Layer Orchestration
          </text>
          <text x="275" y="245" textAnchor="middle" className="text-xs fill-neutral-400">
            Draft → Audit → Feasibility
          </text>
        </g>

        {/* Database Layer */}
        <g>
          <rect
            x="425"
            y="180"
            width="200"
            height="80"
            rx="12"
            className="fill-neutral-800 stroke-neutral-600"
            strokeWidth="1"
          />
          <text x="525" y="210" textAnchor="middle" className="text-sm fill-neutral-100 font-medium">
            Database
          </text>
          <text x="525" y="230" textAnchor="middle" className="text-xs fill-neutral-300">
            Supabase PostgreSQL
          </text>
          <text x="525" y="245" textAnchor="middle" className="text-xs fill-neutral-400">
            Sessions · Tasks · Context
          </text>
        </g>

        {/* Arrows */}
        <line x1="250" y1="90" x2="300" y2="90" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-neutral-500" />
        <line x1="500" y1="90" x2="550" y2="90" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-neutral-500" />
        <line x1="400" y1="130" x2="275" y2="180" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-neutral-500" />
        <line x1="400" y1="130" x2="525" y2="180" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" className="text-neutral-500" />

        {/* Labels */}
        <text x="275" y="140" textAnchor="middle" className="text-xs fill-neutral-500">
          AI Requests
        </text>
        <text x="525" y="140" textAnchor="middle" className="text-xs fill-neutral-500">
          State Updates
        </text>

        {/* Footer */}
        <text x="400" y="350" textAnchor="middle" className="text-xs fill-neutral-500">
          * Detailed diagrams available via live tools (ELK/Dagre)
        </text>
      </svg>
    </Card>
  );
}