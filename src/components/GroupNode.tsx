/**
 * GroupNode — Collapsible container node for organizing task nodes.
 *
 * Expanded: labeled container with colored top border, children positioned inside.
 * Collapsed: compact card with dependency count badge.
 */
import { memo, useMemo } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import type { GroupNodeData } from "../types"
import { usePMGraphStore } from "../store/usePMGraphStore"

function GroupNode({ id, data, selected }: NodeProps<Node<GroupNodeData>>) {
  const collapsed = (data.collapsed as boolean) ?? false
  const color = (data.color as string) ?? "#6b7280"
  const title = (data.title as string) ?? "Group"
  const toggleCollapse = usePMGraphStore((s) => s.toggleGroupCollapse)
  const nodes = usePMGraphStore((s) => s.nodes)
  const edges = usePMGraphStore((s) => s.edges)

  // Count dependencies for badge
  const { depsIn, depsOut } = useMemo(() => {
    const childIds = new Set(nodes.filter((n) => n.parentId === id).map((n) => n.id))
    let inCount = 0
    let outCount = 0
    for (const e of edges) {
      const srcInGroup = childIds.has(e.source)
      const tgtInGroup = childIds.has(e.target)
      if (srcInGroup && !tgtInGroup) outCount++
      if (!srcInGroup && tgtInGroup) inCount++
    }
    return { depsIn: inCount, depsOut: outCount }
  }, [id, nodes, edges])

  return (
    <div
      className={[
        "rounded-xl border overflow-hidden transition-all duration-150",
        selected
          ? "ring-2 ring-offset-2 ring-offset-[var(--color-surface-base)]"
          : "",
      ].join(" ")}
      style={{
        borderColor: color + "40",
        backgroundColor: collapsed ? "var(--color-surface-raised)" : "transparent",
        minWidth: collapsed ? 200 : undefined,
        minHeight: collapsed ? undefined : 100,
        width: collapsed ? 200 : "100%",
        height: collapsed ? "auto" : "100%",
        ...(selected ? { "--tw-ring-color": color + "66" } as React.CSSProperties : {}),
      }}
    >
      {/* Header */}
      <div
        className="node-drag-handle flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: collapsed ? "none" : `2px solid ${color}40` }}
        onClick={() => toggleCollapse(id)}
      >
        {/* Collapse chevron */}
        <span
          className="text-xs text-white/50 transition-transform duration-150"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>

        <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate flex-1">
          {title}
        </span>

        {/* Color indicator */}
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      </div>

      {/* Collapsed badge */}
      {collapsed && (depsIn > 0 || depsOut > 0) && (
        <div className="px-3 pb-2 text-[10px] text-[var(--color-text-muted)]">
          {depsIn} in · {depsOut} out
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="group-in"
        className="w-2! h-2! rounded-full! bg-white/30! border-0! left-0! top-1/2! -translate-y-1/2!"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="group-out"
        className="w-2! h-2! rounded-full! bg-white/30! border-0! right-0! top-1/2! -translate-y-1/2!"
      />
    </div>
  )
}

export default memo(GroupNode)
