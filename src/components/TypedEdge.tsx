/**
 * TypedEdge — Custom edge with visual styling based on edge type.
 *
 * Types: blocks (red solid), relates (gray dashed), triggers (blue dash-dot).
 * Synthetic edges (from collapsed groups) render thicker with a count label.
 * Blocking edges get a CSS pulse animation.
 */
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react"
import type { PMEdgeData } from "../types"
import { EDGE_TYPE_STYLES } from "../utils/colors"

export default function TypedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
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
    <g className={edgeType === "blocks" ? "edge-blocker" : undefined}>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
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
