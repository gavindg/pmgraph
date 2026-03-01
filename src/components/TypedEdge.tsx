/**
 * TypedEdge — Custom directed edge with type-based styling.
 *
 * Types: blocks (red solid), relates (gray dashed), triggers (blue dash-dot).
 * Synthetic edges (collapsed group aggregations) are thicker with a count label.
 * Arrow markers are defined globally in GraphCanvas via <EdgeArrowDefs>.
 * Click to cycle edge type, double-click to delete.
 */
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react"
import type { PMEdgeData, EdgeType } from "../types"
import { EDGE_TYPE_STYLES } from "../utils/colors"

/** Render this once in GraphCanvas to define all arrow markers globally. */
export function EdgeArrowDefs() {
  const types: EdgeType[] = ["blocks", "relates", "triggers"]
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {types.map((t) => (
          <marker
            key={t}
            id={`pm-arrow-${t}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_TYPE_STYLES[t].stroke} />
          </marker>
        ))}
      </defs>
    </svg>
  )
}

export default function TypedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<PMEdgeData>>) {
  const edgeType = data?.edgeType ?? "blocks"
  const isSynthetic = data?.synthetic ?? false
  const count = data?.count ?? 1
  const typeStyle = EDGE_TYPE_STYLES[edgeType]

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <g>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#pm-arrow-${edgeType})`}
        style={{
          stroke: typeStyle.stroke,
          strokeWidth: isSynthetic ? 4 : 2,
          strokeDasharray: isSynthetic ? "8 4" : typeStyle.dash,
        }}
      />
      {isSynthetic && count > 1 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
          >
            ×{count}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  )
}
