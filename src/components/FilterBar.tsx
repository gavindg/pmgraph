/**
 * FilterBar — Linear-style top bar.
 *
 * Left:  PMGraph title + status quick-filter tabs (All Tasks / Active / Done)
 * Right: Department dropdown + View toggle
 */
import { useState, useRef, useEffect, useMemo } from "react"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { PRESETS } from "../utils/presets"
import type { TaskNodeData, LabelItem } from "../types"

export default function FilterBar() {
	const filters = usePMGraphStore((s) => s.filters)
	const setFilters = usePMGraphStore((s) => s.setFilters)
	const nodes = usePMGraphStore((s) => s.nodes)
	const activeView = usePMGraphStore((s) => s.activeView)
	const setActiveView = usePMGraphStore((s) => s.setActiveView)
	const activePresetId = usePMGraphStore((s) => s.activePresetId)
	const setPreset = usePMGraphStore((s) => s.setPreset)
	const preset = usePMGraphStore((s) => getActivePreset(s))

	// Collect all unique labels across task nodes
	const allLabels = useMemo(() => {
		const map = new Map<string, LabelItem>()
		for (const n of nodes) {
			if (n.type !== "task") continue
			for (const l of (n.data as TaskNodeData).labels ?? []) {
				if (!map.has(l.text)) map.set(l.text, l)
			}
		}
		return Array.from(map.values())
	}, [nodes])

	// Derive current tab: "all" or a specific status id
	const currentTab =
		filters.statuses.length === 0
			? "all"
			: filters.statuses.length === 1
				? filters.statuses[0]
				: "all"

	const setTab = (tab: string) => {
		setFilters({ statuses: tab === "all" ? [] : [tab] })
	}

	return (
		<header className="flex items-center h-12 px-4 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-default)] shrink-0">
			{/* Left side */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => setActiveView("graph")}
					className="text-base font-bold text-[var(--color-text-primary)] shrink-0 hover:text-white transition-colors"
				>
					ZZGraph
				</button>

				{/* Status tabs */}
				<nav className="flex items-center gap-0.5">
					<button
						onClick={() => setTab("all")}
						className={[
							"text-xs px-2.5 py-1 rounded-md transition-colors duration-150",
							currentTab === "all"
								? "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] font-medium"
								: "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
						].join(" ")}
					>
						All Tasks
					</button>
					{preset.statuses.map((s) => (
						<button
							key={s.id}
							onClick={() => setTab(s.id)}
							className={[
								"text-xs px-2.5 py-1 rounded-md transition-colors duration-150",
								currentTab === s.id
									? "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] font-medium"
									: "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
							].join(" ")}
						>
							{s.label}
						</button>
					))}
				</nav>
			</div>

			{/* Right side */}
			<div className="flex items-center gap-2 ml-auto">
				{/* Label dropdown */}
				<LabelDropdown
					labels={allLabels}
					selected={filters.labels}
					onToggle={(label) => {
						const current = filters.labels
						const next = current.includes(label)
							? current.filter((l) => l !== label)
							: [...current, label]
						setFilters({ labels: next })
					}}
					onClear={() => setFilters({ labels: [] })}
				/>

				{/* Department dropdown */}
				<DepartmentDropdown
					categories={preset.categories}
					selected={filters.departments}
					onToggle={(dept) => {
						const current = filters.departments
						const next = current.includes(dept)
							? current.filter((d) => d !== dept)
							: [...current, dept]
						setFilters({ departments: next })
					}}
					onClear={() => setFilters({ departments: [] })}
				/>

				{/* Preset selector */}
				<PresetSelector
					activePresetId={activePresetId}
					onSelect={setPreset}
				/>

				{/* View toggle */}
				<button
					onClick={() => setActiveView(activeView === "graph" ? "kanban" : "graph")}
					className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
					title={activeView === "graph" ? "Switch to Kanban" : "Switch to Graph"}
				>
					{activeView === "graph" ? (
						// Kanban icon
						<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
						</svg>
					) : (
						// Graph icon
						<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					)}
					{activeView === "graph" ? "Board" : "Graph"}
				</button>
			</div>
		</header>
	)
}

// ── Department dropdown ──────────────────────────────────────────────────────

function DepartmentDropdown({
	categories,
	selected,
	onToggle,
	onClear,
}: {
	categories: { name: string; color: string }[]
	selected: string[]
	onToggle: (dept: string) => void
	onClear: () => void
}) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
				setOpen(false)
			}
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [open])

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className={[
					"flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors duration-150",
					selected.length > 0
						? "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)]"
						: "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
				].join(" ")}
			>
				Department
				{selected.length > 0 && (
					<span className="bg-blue-600/30 text-blue-400 text-[10px] px-1.5 rounded-full font-medium">
						{selected.length}
					</span>
				)}
				<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg shadow-xl z-50 py-1">
					{categories.map((cat) => {
						const active = selected.includes(cat.name)
						return (
							<button
								key={cat.name}
								onClick={() => onToggle(cat.name)}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--color-surface-overlay)] transition-colors"
							>
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: cat.color }}
								/>
								<span className={active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
									{cat.name}
								</span>
								{active && (
									<svg className="w-3 h-3 ml-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
									</svg>
								)}
							</button>
						)
					})}
					{selected.length > 0 && (
						<>
							<hr className="border-[var(--color-border-subtle)] my-1" />
							<button
								onClick={() => { onClear(); setOpen(false) }}
								className="w-full px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-left hover:bg-[var(--color-surface-overlay)] transition-colors"
							>
								Clear filter
							</button>
						</>
					)}
				</div>
			)}
		</div>
	)
}

// ── Label dropdown ──────────────────────────────────────────────────────────

function LabelDropdown({
	labels,
	selected,
	onToggle,
	onClear,
}: {
	labels: LabelItem[]
	selected: string[]
	onToggle: (label: string) => void
	onClear: () => void
}) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
				setOpen(false)
			}
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [open])

	if (labels.length === 0) return null

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className={[
					"flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors duration-150",
					selected.length > 0
						? "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)]"
						: "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
				].join(" ")}
			>
				Labels
				{selected.length > 0 && (
					<span className="bg-blue-600/30 text-blue-400 text-[10px] px-1.5 rounded-full font-medium">
						{selected.length}
					</span>
				)}
				<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg shadow-xl z-50 py-1">
					{labels.map((label) => {
						const active = selected.includes(label.text)
						return (
							<button
								key={label.text}
								onClick={() => onToggle(label.text)}
								className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--color-surface-overlay)] transition-colors"
							>
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: label.color }}
								/>
								<span className={active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
									{label.text}
								</span>
								{active && (
									<svg className="w-3 h-3 ml-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
									</svg>
								)}
							</button>
						)
					})}
					{selected.length > 0 && (
						<>
							<hr className="border-[var(--color-border-subtle)] my-1" />
							<button
								onClick={() => { onClear(); setOpen(false) }}
								className="w-full px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-left hover:bg-[var(--color-surface-overlay)] transition-colors"
							>
								Clear filter
							</button>
						</>
					)}
				</div>
			)}
		</div>
	)
}

// ── Preset selector ──────────────────────────────────────────────────────────

function PresetSelector({
	activePresetId,
	onSelect,
}: {
	activePresetId: string
	onSelect: (id: string) => void
}) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)
	const activePreset = PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0]

	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
				setOpen(false)
			}
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [open])

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
			>
				{activePreset.label}
				<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg shadow-xl z-50 py-1">
					{PRESETS.map((p) => (
						<button
							key={p.id}
							onClick={() => { onSelect(p.id); setOpen(false) }}
							className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--color-surface-overlay)] transition-colors"
						>
							<span className={p.id === activePresetId ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
								{p.label}
							</span>
							{p.id === activePresetId && (
								<svg className="w-3 h-3 ml-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
