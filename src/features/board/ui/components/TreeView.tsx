import React, { useMemo } from "react";
import { Task } from "@/types/structure";

// ファイルツリー構築用の型定義
type FileNode = {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  fullPath: string;
  relatedTasks: Task[];
};

interface TreeViewProps {
  tasks: Task[];
  activeTask: Task | null;
  onSelectTask: (task: Task) => void;
}

/**
 * ファイル階層をツリー形式で表示し、関連タスクとの関係を可視化するコンポーネント
 */
export function TreeView({ tasks, activeTask, onSelectTask }: TreeViewProps) {
  const fileTree = useMemo(() => buildFileTree(tasks), [tasks]);

  const renderNode = (node: FileNode, depth = 0): React.ReactNode => {
    const indent = "  ".repeat(depth);
    const icon = node.type === 'directory' ? '📁' : '📄';
    
    const isRelated = activeTask && node.relatedTasks.some(t => t.id === activeTask.id);
    const hasRelatedDescendants = activeTask && hasRelatedFiles(node, activeTask);

    return (
      <div key={node.fullPath || node.name} className="text-sm">
        <div 
          className={`flex items-center gap-1 py-0.5 px-2 hover:bg-neutral-800/50 rounded cursor-pointer ${
            isRelated ? 'bg-emerald-900/30 border-l-2 border-emerald-600' : ''
          } ${hasRelatedDescendants ? 'bg-neutral-800/30' : ''}`}
          onClick={() => {
            if (node.relatedTasks.length > 0) {
              onSelectTask(node.relatedTasks[0]);
            }
          }}
        >
          <span className="text-xs opacity-60 font-mono">{indent}</span>
          <span className="text-xs">{icon}</span>
          <span className={`text-xs ${isRelated ? 'font-medium text-emerald-300' : 'text-neutral-300'}`}>
            {node.name}
          </span>
          {node.relatedTasks.length > 0 && (
            <span className="text-xs opacity-60 ml-auto">
              ({node.relatedTasks.map(t => t.id).join(', ')})
            </span>
          )}
        </div>
        
        {node.children && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="text-sm font-medium">File Tree</div>
        <div className="text-xs opacity-70 mt-1">
          {activeTask 
            ? `Focused around ${activeTask.id} - ${activeTask.title}` 
            : "Click files to select related tasks"
          }
        </div>
      </div>
      
      <div className="p-4 max-h-[500px] overflow-auto">
        {fileTree.children && fileTree.children.length > 0 ? (
          fileTree.children.map(child => renderNode(child))
        ) : (
          <div className="text-xs opacity-60">No files found</div>
        )}
      </div>
    </div>
  );
}

/**
 * タスクのfiles_outからファイルツリー構造を構築
 */
function buildFileTree(tasks: Task[]): FileNode {
  const root: FileNode = {
    name: 'project',
    type: 'directory',
    children: [],
    fullPath: '',
    relatedTasks: []
  };

  const allPaths = tasks.flatMap(task => 
    task.files_out.map(path => ({ path, task }))
  );

  allPaths.forEach(({ path, task }) => {
    const parts = path.split('/').filter(Boolean);
    let currentNode = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (!currentNode.children) {
        currentNode.children = [];
      }

      let childNode = currentNode.children.find(child => child.name === part);
      
      if (!childNode) {
        childNode = {
          name: part,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          fullPath: currentPath,
          relatedTasks: []
        };
        currentNode.children.push(childNode);
      }

      if (isFile) {
        if (!childNode.relatedTasks.some(t => t.id === task.id)) {
          childNode.relatedTasks.push(task);
        }
      }

      currentNode = childNode;
    }
  });

  // ディレクトリとファイルをアルファベット順にソート
  function sortNode(node: FileNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNode);
    }
  }

  sortNode(root);
  return root;
}

/**
 * ノードが選択タスクに関連するファイルを子孫に持つかチェック
 */
function hasRelatedFiles(node: FileNode, activeTask: Task): boolean {
  if (node.relatedTasks.some(t => t.id === activeTask.id)) {
    return true;
  }
  
  if (node.children) {
    return node.children.some(child => hasRelatedFiles(child, activeTask));
  }
  
  return false;
}