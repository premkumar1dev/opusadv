import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import { TextRevealLine } from "../components/motion/TextReveal";
import { BlurReveal } from "../components/motion/BlurScaleReveal";
import { ScrollSection } from "../components/motion/ScrollSection";
import ConstellationGrid from "@/components/ui/constellation-grid";

const DOTS = [
  { color: "bg-red-500", label: "API" },
  { color: "bg-yellow-500", label: "SDK" },
  { color: "bg-green-500", label: "live" },
];

export default function Hero() {
  const [cursorVisible, setCursorVisible] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ctx: any;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // 1. Entrance Stagger Animation
        gsap.fromTo(
          [
            badgeRef.current,
            headingRef.current,
            subheadlineRef.current,
            buttonsRef.current,
            codeRef.current
          ],
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.12,
            ease: "power3.out",
          }
        );

        // 2. Parallax Animations on Scroll
        if (giantTextRef.current && wrapperRef.current) {
          gsap.fromTo(
            giantTextRef.current,
            { y: "5vh", scale: 0.95 },
            {
              y: "-15vh",
              scale: 1.05,
              scrollTrigger: {
                trigger: wrapperRef.current,
                start: "top top",
                end: "bottom top",
                scrub: 1.5,
              },
            }
          );
        }

        // 3. Grid Parallax
        if (gridRef.current) {
          gsap.to(gridRef.current, {
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 1,
            },
            y: 100,
            opacity: 0.3,
          });
        }

        // 4. Aurora Animation
        if (auroraRef.current) {
          gsap.to(auroraRef.current, {
            rotation: 45,
            scale: 1.5,
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 2,
            },
          });
        }
      }, wrapperRef);

      return () => ctx.revert();
    })();

    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Cursor-follow light on terminal
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = terminal.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      terminal.style.setProperty("--cursor-x", `${x}%`);
      terminal.style.setProperty("--cursor-y", `${y}%`);
    };

    terminal.addEventListener("mousemove", handleMouseMove);
    return () => terminal.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={wrapperRef}
      className="relative min-h-[90vh] flex items-center justify-center bg-background pt-24 pb-16 overflow-hidden"
    >
      {/* Interactive Dynamic Constellation Mesh Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <ConstellationGrid hideOverlay className="w-full h-full opacity-85" />
      </div>

      {/* Animated aurora blobs */}
      <div
        ref={auroraRef}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none blur-3xl blob-1"
        style={{
          background: "radial-gradient(circle, rgba(201,100,66,0.1) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full pointer-events-none blur-3xl blob-2"
        style={{
          background: "radial-gradient(circle, rgba(156,135,245,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          New — Fable 5 & Sonnet 5, live
        </div>

        {/* Giant parallax text */}
        <div
          ref={giantTextRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <span className="text-[18vw] font-bold whitespace-nowrap" style={{ color: "rgba(61,57,41,0.07)" }}>
            Opus Zen
          </span>
        </div>

        {/* Headline */}
        <h1
          ref={headingRef}
          className="relative text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-foreground mb-6"
        >
          <TextRevealLine>The whole Claude lineup.</TextRevealLine>
          <br />
          <TextRevealLine className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-amber-500 inline-block font-extrabold">
            One key. No waitlist.
          </TextRevealLine>
        </h1>

        {/* Subtext */}
        <p
          ref={subheadlineRef}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Access every Claude model — from Haiku to Fable 5 — through a single API
          key. Pay per token with transparent pricing, rolling budgets, and zero markups.
        </p>

        {/* CTAs */}
        <div ref={buttonsRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            to="/pricing"
            className="magnetic-btn px-8 py-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>Explore Plans & Pricing</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <Link
            to="/docs"
            className="magnetic-btn px-8 py-3.5 rounded-lg border border-border text-secondary-foreground hover:text-foreground hover:border-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>View Documentation</span>
          </Link>
        </div>

        {/* Value Highlights / Text Placeholders */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground mb-12">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Instant API key delivery
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Pay via UPI or Cards
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            5h rolling token budgets
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Zero markup pricing
          </span>
        </div>

        {/* Terminal mockup */}
        <div ref={codeRef} className="max-w-2xl mx-auto text-left px-2 sm:px-0">
          <BlurReveal>
            <div
              ref={terminalRef}
              className="relative bg-card border border-border rounded-xl overflow-hidden shadow-md group"
              style={{
                "--cursor-x": "50%",
                "--cursor-y": "50%",
                background:
                  "radial-gradient(600px circle at var(--cursor-x) var(--cursor-y), rgba(201,100,66,0.04), transparent 60%)",
              } as React.CSSProperties}
            >
              {/* Cursor-following gradient overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(400px circle at var(--cursor-x) var(--cursor-y), rgba(201,100,66,0.06), transparent 60%)",
                }}
                aria-hidden="true"
              />
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border relative z-10">
                {DOTS.map((dot) => (
                  <span
                    key={dot.color}
                    className={`w-3 h-3 rounded-full ${dot.color}`}
                  />
                ))}
                <span className="ml-3 text-xs text-muted-foreground font-mono">
                  quickstart terminal
                </span>
              </div>
              {/* Terminal body */}
              <div className="p-3 sm:p-5 font-mono text-xs sm:text-sm space-y-2 relative z-10">
                <div>
                  <span className="text-muted-foreground">$ </span>
                  <span className="text-foreground">
                    export ANTHROPIC_BASE_URL=
                  </span>
                  <span className="text-primary">https://api.opuszen.shop</span>
                </div>
                <div>
                  <span className="text-muted-foreground">$ </span>
                  <span className="text-foreground">
                    export ANTHROPIC_API_KEY=
                  </span>
                  <span className="text-emerald-600">sk-ant-zen-your-key-here</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground">$ </span>
                  <span className="text-foreground ml-0.5">npx opuszen</span>
                  <span
                    className={`ml-0.5 text-primary ${cursorVisible ? "opacity-100" : "opacity-0"}`}
                  >
                    █
                  </span>
                </div>
              </div>
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-border relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs text-muted-foreground font-mono">
                  <span className="text-secondary-foreground/60">model:</span> claude-fable-5
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs text-muted-foreground font-mono">
                  <span className="text-secondary-foreground/60">context:</span> 1M window
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary font-mono">
                  <span className="text-primary/70">plan:</span> transparent token rates
                </span>
              </div>
            </div>
          </BlurReveal>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-secondary-foreground/60"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
