"use client";

import { Loader2, FilePlus, FileEdit, FilePen, FileX, ArrowRightLeft, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

export function getToolDescription(toolInvocation: ToolInvocation): {
  label: string;
  icon: LucideIcon;
} {
  const { toolName, args } = toolInvocation;
  const path = typeof args?.path === "string" ? args.path : "";
  const fileName = path.split("/").pop() || path;

  if (toolName === "str_replace_editor") {
    const command = args?.command as string | undefined;
    switch (command) {
      case "create":
        return { label: `Creating ${fileName}`, icon: FilePlus };
      case "str_replace":
        return { label: `Editing ${fileName}`, icon: FileEdit };
      case "insert":
        return { label: `Inserting into ${fileName}`, icon: FilePen };
      case "view":
        return { label: `Reading ${fileName}`, icon: FileEdit };
      default:
        return { label: `Editing ${fileName}`, icon: FileEdit };
    }
  }

  if (toolName === "file_manager") {
    const command = args?.command as string | undefined;
    switch (command) {
      case "delete":
        return { label: `Deleting ${fileName}`, icon: FileX };
      case "rename": {
        const newPath = typeof args?.new_path === "string" ? args.new_path : "";
        const newFileName = newPath.split("/").pop() || newPath;
        return { label: `Renaming ${fileName} → ${newFileName}`, icon: ArrowRightLeft };
      }
      default:
        return { label: `Managing ${fileName}`, icon: Wrench };
    }
  }

  return { label: toolName, icon: Wrench };
}

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationDisplay({ toolInvocation }: ToolInvocationDisplayProps) {
  const isComplete = toolInvocation.state === "result" && toolInvocation.result;
  const { label, icon: Icon } = getToolDescription(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <Icon className="w-3 h-3 text-neutral-500" />
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
