import { motion } from "framer-motion";

const tools = [
 "Claude Code",
 "Cursor",
 "VS Code",
 "Windsurf",
 "Cline",
 "Roo Code",
 "Zed",
 "Anthropic SDK",
];

export default function CompatibilityStrip() {
 return (
 <section className="border-y border-border bg-background py-20">
 <div className="max-w-7xl mx-auto px-6">
 <motion.h3
 initial={{ opacity: 0, y: 10 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5 }}
 className="text-sm font-semibold tracking-normal text-muted-foreground text-center mb-10"
 >
 Works where you already work
 </motion.h3>

 <motion.div
 initial={{ opacity: 0, y: 10 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.1 }}
 className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
 >
 {tools.map((tool) => (
 <span
 key={tool}
 className="text-base md:text-lg text-muted-foreground hover:text-foreground transition-colors cursor-default font-medium"
 >
 {tool}
 </span>
 ))}
 </motion.div>
 </div>
 </section>
 );
}
