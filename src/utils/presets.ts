import type { Preset, StatusDefinition } from "../types"

export const DEFAULT_STATUSES: StatusDefinition[] = [
	{ id: "todo", label: "Todo", color: "#6b7280" },
	{ id: "in-progress", label: "In Progress", color: "#3b82f6" },
	{ id: "done", label: "Done", color: "#22c55e" },
]

export const PRESETS: Preset[] = [
	{
		id: "gamedev",
		label: "Game Dev",
		categories: [
			{ name: "Programming", color: "#673ab7" },
			{ name: "Art", color: "#FF2800" },
			{ name: "Design", color: "#6795ED" },
			{ name: "Audio", color: "#F67E18" },
			{ name: "QA", color: "#22c67e" },
		],
		statuses: DEFAULT_STATUSES,
	},
	{
		id: "startup",
		label: "Startup / Product",
		categories: [
			{ name: "Engineering", color: "#3b82f6" },
			{ name: "Product", color: "#a855f7" },
			{ name: "Design", color: "#ec4899" },
			{ name: "Marketing", color: "#f97316" },
			{ name: "Ops", color: "#22c55e" },
		],
		statuses: DEFAULT_STATUSES,
	},
	{
		id: "personal",
		label: "Personal",
		categories: [
			{ name: "Work", color: "#3b82f6" },
			{ name: "Personal", color: "#a855f7" },
			{ name: "Health", color: "#22c55e" },
			{ name: "Learning", color: "#eab308" },
		],
		statuses: DEFAULT_STATUSES,
	},
]

export function getPresetById(id: string): Preset {
	return PRESETS.find((p) => p.id === id) ?? PRESETS[0]
}
