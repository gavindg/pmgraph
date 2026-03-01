/**
 * NodeFocusPanel — Full-screen modal for creating or editing a task node.
 *
 * Create mode: all fields empty, submit calls addNode.
 * Edit mode (F key): pre-fills from existing node, submit calls updateNode.
 *
 * Keyboard: Escape = close, Ctrl+Enter = submit.
 */
import { useState, useEffect, useRef, useMemo } from "react"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { PRIORITY_COLORS, LABEL_COLORS } from "../utils/colors"
import { DUMMY_USERS } from "../utils/users"
import type { TaskNodeData, Priority, LabelItem } from "../types"

const PRIORITIES: Priority[] = ["low", "medium", "high"]

interface NodeFocusPanelProps {
	mode: "create" | "edit"
	nodeId?: string
	onSubmit: (data: Partial<TaskNodeData>) => void
	onClose: () => void
}

export default function NodeFocusPanel({ mode, nodeId, onSubmit, onClose }: NodeFocusPanelProps) {
	const preset = usePMGraphStore((s) => getActivePreset(s))
	const nodes = usePMGraphStore((s) => s.nodes)
	const existingData = mode === "edit" && nodeId
		? (nodes.find((n) => n.id === nodeId)?.data as TaskNodeData | undefined)
		: undefined

	const [title, setTitle] = useState(existingData?.title ?? "")
	const [description, setDescription] = useState(existingData?.description ?? "")
	const [department, setDepartment] = useState(existingData?.department ?? "")
	const [assignee, setAssignee] = useState(existingData?.assignee ?? "")
	const [priority, setPriority] = useState<Priority>(existingData?.priority ?? "medium")
	const [labels, setLabels] = useState<LabelItem[]>(existingData?.labels ?? [])
	const [labelInput, setLabelInput] = useState("")
	const [labelColor, setLabelColor] = useState<string>(LABEL_COLORS[0])
	const [dueDate, setDueDate] = useState((existingData?.dueDate as string) ?? "")
	const titleRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		titleRef.current?.focus()
		if (mode === "edit") titleRef.current?.select()
	}, [mode])

	const handleSubmit = () => {
		onSubmit({
			title: title.trim() || "Untitled",
			description,
			department,
			assignee,
			priority,
			labels,
			dueDate: dueDate || null,
		})
	}

	// Ctrl+Enter → submit (Escape handled in GraphCanvas)
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault()
				handleSubmit()
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	})

	const addLabel = () => {
		const t = labelInput.trim()
		if (t && !labels.some((l) => l.text === t)) {
			setLabels([...labels, { text: t, color: labelColor }])
		}
		setLabelInput("")
	}

	return (
		<>
			{/* Backdrop */}
			<div className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm" onClick={onClose} />

			{/* Modal */}
			<div className="fixed inset-0 z-[999] flex items-center justify-center p-4 pointer-events-none">
				<div
					className="w-full max-w-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] rounded-xl shadow-2xl pointer-events-auto"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-subtle)]">
						<span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
							{mode === "edit" ? "Edit Task" : "New Task"}
						</span>
						<button
							onClick={onClose}
							className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-lg leading-none"
						>
							×
						</button>
					</div>

					<div className="flex flex-col gap-4 px-5 py-4 max-h-[70vh] overflow-y-auto">
						{/* Title */}
						<input
							ref={titleRef}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Task title…"
							className="text-base font-semibold bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] w-full"
						/>

						{/* Description */}
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Description…"
							className={`${inputClass} resize-none h-20`}
						/>

						<hr className="border-[var(--color-border-subtle)]" />

						{/* Department chips */}
						<Field label="Department">
							<div className="flex flex-wrap gap-1.5">
								<ChipButton active={department === ""} onClick={() => setDepartment("")}>
									None
								</ChipButton>
								{preset.categories.map((cat) => (
									<ChipButton
										key={cat.name}
										active={department === cat.name}
										color={cat.color}
										onClick={() => setDepartment(cat.name)}
									>
										{cat.name}
									</ChipButton>
								))}
							</div>
						</Field>

						{/* Priority */}
						<Field label="Priority">
							<div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
								{PRIORITIES.map((p) => {
									const active = priority === p
									return (
										<button
											key={p}
											type="button"
											onClick={() => setPriority(p)}
											className={[
												"flex-1 py-1.5 text-xs font-medium transition-colors duration-150",
												active
													? "text-white"
													: "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
											].join(" ")}
											style={active ? { backgroundColor: PRIORITY_COLORS[p].bg } : {}}
										>
											{p.charAt(0).toUpperCase() + p.slice(1)}
										</button>
									)
								})}
							</div>
						</Field>

						<div className="grid grid-cols-2 gap-3">
							<Field label="Assignee">
								<AssigneeInput value={assignee} onChange={setAssignee} />
							</Field>
							<Field label="Due Date">
								<input
									type="date"
									value={dueDate}
									onChange={(e) => setDueDate(e.target.value)}
									className={inputClass}
								/>
							</Field>
						</div>

						{/* Labels */}
						<Field label="Labels">
							<div className="flex gap-2">
								<input
									value={labelInput}
									onChange={(e) => setLabelInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault()
											addLabel()
										}
									}}
									placeholder="Type and press Enter…"
									className={`${inputClass} flex-1`}
								/>
								{/* Color picker dots */}
								<div className="flex items-center gap-1">
									{LABEL_COLORS.map((c) => (
										<button
											key={c}
											type="button"
											onClick={() => setLabelColor(c)}
											className={[
												"w-4 h-4 rounded-full shrink-0 transition-transform duration-100",
												labelColor === c ? "scale-125 ring-1 ring-white/50 ring-offset-1 ring-offset-[var(--color-surface-raised)]" : "opacity-60 hover:opacity-100",
											].join(" ")}
											style={{ backgroundColor: c }}
										/>
									))}
								</div>
							</div>
							{labels.length > 0 && (
								<div className="flex flex-wrap gap-1 mt-1.5">
									{labels.map((l) => (
										<span
											key={l.text}
											className="inline-flex items-center gap-1 text-[11px] pl-2 pr-1 py-0.5 rounded-full text-white/90"
											style={{ backgroundColor: l.color + "44" }}
										>
											{l.text}
											<button
												type="button"
												onClick={() => setLabels(labels.filter((x) => x.text !== l.text))}
												className="text-white/40 hover:text-white/80 transition-colors w-4 h-4 flex items-center justify-center"
											>
												×
											</button>
										</span>
									))}
								</div>
							)}
						</Field>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-subtle)]">
						<span className="text-[11px] text-[var(--color-text-muted)]">
							<kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[10px] font-mono">
								Ctrl+Enter
							</kbd>{" "}
							to {mode === "edit" ? "save" : "create"}
						</span>
						<div className="flex gap-2">
							<button
								onClick={onClose}
								className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleSubmit}
								className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-150"
							>
								{mode === "edit" ? "Save" : "Create"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
				{label}
			</label>
			{children}
		</div>
	)
}

function ChipButton({
	active,
	color,
	onClick,
	children,
}: {
	active: boolean
	color?: string
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				"text-xs px-2.5 py-1 rounded-full border transition-colors duration-150",
				active
					? color
						? "text-white border-transparent"
						: "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
					: "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
			].join(" ")}
			style={active && color ? { backgroundColor: color } : {}}
		>
			{children}
		</button>
	)
}

function AssigneeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	const [focused, setFocused] = useState(false)
	const suggestions = useMemo(() => {
		if (!value) return DUMMY_USERS
		const q = value.toLowerCase()
		return DUMMY_USERS.filter((u) => u.toLowerCase().includes(q))
	}, [value])

	return (
		<div className="relative">
			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setTimeout(() => setFocused(false), 150)}
				placeholder="Who owns this?"
				className={inputClass}
			/>
			{focused && suggestions.length > 0 && (
				<div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] rounded-md shadow-lg max-h-36 overflow-y-auto">
					{suggestions.map((u) => (
						<button
							key={u}
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => { onChange(u); setFocused(false) }}
							className="w-full text-left px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
						>
							{u}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

const inputClass =
	"bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:border-[var(--color-text-muted)] placeholder-[var(--color-text-muted)] transition-colors duration-150"
