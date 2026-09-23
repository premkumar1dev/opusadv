import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const tools = [
	{ name: "Claude Code", color: "#d97757" },
	{ name: "Cursor", color: "#1e1e1e" },
	{ name: "VS Code", color: "#007acc" },
	{ name: "Windsurf", color: "#2d6cdf" },
	{ name: "Cline", color: "#a78bfa" },
	{ name: "Roo Code", color: "#f97316" },
	{ name: "Zed", color: "#06b6d4" },
	{ name: "Anthropic SDK", color: "#d4a574" },
];

/* Infinite scroll speed — higher = slower */
const DURATION = 28;

export default function LogoTicker() {
	const sectionRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start end", "end start"],
	});
	const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.3, 1, 1, 0.3]);

	return (
		<section ref={sectionRef} className="relative py-20 overflow-hidden bg-background">
			<motion.div style={{ opacity }} className="text-center mb-10">
				<h3 className="text-sm font-semibold tracking-normal text-muted-foreground">
					Works where you already work
				</h3>
			</motion.div>

			{/* Fade edges */}
			<div
				className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
				style={{
					background: "linear-gradient(to right, var(--color-background) 0%, transparent 100%)",
				}}
				aria-hidden="true"
			/>
			<div
				className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
				style={{
					background: "linear-gradient(to left, var(--color-background) 0%, transparent 100%)",
				}}
				aria-hidden="true"
			/>

			{/* Scroll track */}
			<div className="relative">
				{/* Track 1 — scrolls left */}
				<div
					className="flex items-center gap-10"
					style={{
						width: "max-content",
						animation: `ticker-left ${DURATION}s linear infinite`,
					}}
				>
					{tools.map((tool, i) => (
						<ToolBadge key={`a-${i}`} tool={tool} />
					))}
					{tools.map((tool, i) => (
						<ToolBadge key={`a-dup-${i}`} tool={tool} />
					))}
				</div>
			</div>

			<style>{`
				@keyframes ticker-left {
					0% { transform: translateX(0); }
					100% { transform: translateX(-50%); }
				}
			`}</style>
		</section>
	);
}

function ToolBadge({ tool }: { tool: { name: string; color: string } }) {
	return (
		<div
			className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/60 bg-card/80 backdrop-blur-sm whitespace-nowrap select-none"
			style={{ boxShadow: `0 0 20px ${tool.color}08` }}
		>
			<span
				className="w-2.5 h-2.5 rounded-full"
				style={{ backgroundColor: tool.color }}
			/>
			<span className="text-sm font-semibold text-foreground/80 tracking-tight">
				{tool.name}
			</span>
		</div>
	);
}
