import { type MetaFunction } from "react-router";
import type { Route } from "./+types/docs";
import { Layout } from "../components/Layout";
import { useState, useEffect } from "react";

import { buildPageMetaTags } from "~/utils/meta-helper";

export const meta: MetaFunction = ({ matches }) => {
	return buildPageMetaTags(matches, "/docs");
};

// ─── Table of contents ───────────────────────────────────────────────────────

const sections = [
 { id: "overview", label: "Overview" },
 { id: "quick-start", label: "Quick Start" },
 { id: "ide-configuration", label: "IDE Configuration" },
 { id: "api-reference", label: "API Reference" },
 { id: "models", label: "Models" },
 { id: "built-in-tools", label: "Built-in Tools" },
 { id: "troubleshooting", label: "Troubleshooting" },
];

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
 const [copied, setCopied] = useState(false);

 const handleCopy = async () => {
 try {
 await navigator.clipboard.writeText(code);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 } catch (err) {
 console.error("Failed to copy text: ", err);
 }
 };

 return (
    <div className="relative group rounded-xl border border-border bg-secondary/30 overflow-hidden shadow-xs">
      {lang && (
        <div className="px-4 py-2 border-b border-border text-xs font-mono text-primary bg-secondary/60 font-semibold">
          {lang}
        </div>
      )}

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer shadow-xs opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        title="Copy to clipboard"
        aria-label="Copy code"
      >
        {copied ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-primary px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </button>

      <pre className="p-4 pr-12 overflow-x-auto text-sm font-mono text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border flex items-center gap-3">
        <span className="w-1.5 h-6 rounded-full bg-primary" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Docs page ───────────────────────────────────────────────────────────────

export default function DocsRoute() {
 const [activeSection, setActiveSection] = useState("overview");
 const [host, setHost] = useState("opuszen.shop");

 useEffect(() => {
 if (typeof window !== "undefined") {
 setHost(window.location.host.includes("localhost") ? "opuszen.shop" : window.location.host);
 }
 }, []);

 const [models, setModels] = useState<
 { id: string; name: string; context: string; type: string; created?: string }[]
 >([]);

 useEffect(() => {
 const fetchModels = async () => {
 try {
 const res = await fetch("/api/v1/models");
 const json = await res.json();
 if (json.data && Array.isArray(json.data)) {
 const formatted = json.data.map((m: any) => ({
 id: m.id,
 name: m.name || m.id,
 context: m.context || "200,000",
 type: m.type || "Chat / Completion",
 created: m.launch_date || (m.created
 ? new Date(m.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
 : "Dec 2024"),
 }));
 setModels(formatted);
 }
 } catch {
 // fallback
 }
 };
 fetchModels();
 }, []);

 const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
 const apiBaseUrl = `${protocol}//${host}`;

 const scrollTo = (id: string) => {
 const el = document.getElementById(id);
 if (el) {
 el.scrollIntoView({ behavior: "smooth", block: "start" });
 setActiveSection(id);
 }
 };

 return (
 <Layout>
 <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
 {/* Page header */}
 <div className="mb-12">
 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-xs font-semibold text-primary mb-4">
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width="12"
 height="12"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 aria-hidden="true"
 >
 <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
 </svg>
 Documentation
 </div>
 <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
 <span className="text-primary">
 OpusZen Docs
 </span>
 </h1>
 <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
 Anthropic-compatible API gateway providing Claude API access without
 waitlists. Drop-in replacement — just change your base URL.
 </p>
 </div>

 <div className="flex gap-10">
 {/* Side navigation */}
 <aside className="hidden lg:block w-52 shrink-0">
 <nav
 className="sticky top-28 space-y-1 bg-card border border-border rounded-2xl p-3"
 aria-label="Documentation navigation"
 >
 <p className="text-xs font-semibold text-primary uppercase tracking-wider px-3 mb-3">On this page</p>
 {sections.map((s) => (
 <button
 key={s.id}
 onClick={() => scrollTo(s.id)}
 className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
 activeSection === s.id
 ? "bg-primary text-primary-foreground font-semibold shadow-sm"
 : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
 }`}
 >
 {s.label}
 </button>
 ))}
 </nav>
 </aside>

 {/* Main content */}
 <div className="flex-1 min-w-0 max-w-3xl">

 {/* ── Overview ─────────────────────────────────────────── */}
 <Section id="overview" title="Overview">
 <p className="text-muted-foreground leading-relaxed mb-6">
 OpusZen is an Anthropic-compatible API gateway providing Claude
 API access without waitlists. It works with Claude Code, Cursor,
 Windsurf, Cline, Roo Code, and any Anthropic SDK — just swap
 your base URL and go.
 </p>
 <div className="grid sm:grid-cols-2 gap-4">
 {[
 { icon: "⚡", label: "Zero-latency SSE streaming pass-through" },
 { icon: "🔑", label: "Per-key budgets & rolling windows" },
 { icon: "🛠️", label: "Built-in web search & image analysis" },
 { icon: "💰", label: "Prompt caching — cache tokens are free" },
 ].map((item) => (
 <div
 key={item.label}
 className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary/40 transition-all duration-200"
 >
 <span className="text-xl" aria-hidden="true">
 {item.icon}
 </span>
 <span className="text-sm text-foreground font-medium">
 {item.label}
 </span>
 </div>
 ))}
 </div>
 </Section>

 {/* ── Quick Start ───────────────────────────────────────── */}
 <Section id="quick-start" title="Quick Start">
 <h3 className="text-lg font-semibold text-foreground mb-4">
 Prerequisites
 </h3>
 <ul className="space-y-2 mb-8">
 <li className="flex items-start gap-3 text-sm text-muted-foreground">
 <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
 <span>
 <a
 href="https://nodejs.org/en/download/"
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline font-semibold"
 >
 Node.js 18+
 </a>
 </span>
 </li>
 <li className="flex items-start gap-3 text-sm text-muted-foreground">
 <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
 <span>OpusZen API key (from your admin or reseller)</span>
 </li>
 <li className="flex items-start gap-3 text-sm text-muted-foreground">
 <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
 <span>Supported IDE: Claude Code, VS Code, Cursor, Windsurf, Cline, or Roo Code</span>
 </li>
 </ul>

 <h3 className="text-lg font-semibold text-foreground mb-4">
 Interactive Setup
 </h3>
 <p className="text-sm text-muted-foreground mb-3">
 Run the interactive setup wizard — it handles everything:
 </p>
 <CodeBlock
 lang="bash"
 code={`npx opuszen`}
 />
 <p className="text-sm text-muted-foreground mt-3 mb-6">
 Or use the platform-specific setup scripts:
 </p>
 <div className="grid sm:grid-cols-2 gap-3 mb-8">
 <CodeBlock lang="powershell" code={`irm ${apiBaseUrl}/setup.ps1 | iex`} />
 <CodeBlock lang="bash" code={`curl -fsSL ${apiBaseUrl}/setup.sh | bash`} />
 </div>

 <h3 className="text-lg font-semibold text-foreground mb-4">
 Manual Setup
 </h3>
 <p className="text-sm text-muted-foreground mb-3">
 If you prefer to configure manually, edit your settings file and
 set the following environment variables or config values:
 </p>
 <CodeBlock
 lang="json"
 code={`{
 "env": {
 "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
 "ANTHROPIC_BASE_URL": "${apiBaseUrl}"
 }
}`}
 />
 </Section>

  {/* ── IDE Configuration ────────────────────────────────── */}
  <Section id="ide-configuration" title="IDE Configuration">

    {/* Claude Code / VS Code */}
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-lg">
          Claude Code
        </span>
        <span className="text-xs text-muted-foreground">VS Code extension</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Edit{" "}
        <code className="text-xs font-mono bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium">
          ~/.claude/settings.json
        </code>
      </p>
      <CodeBlock
        lang="json"
        code={`{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
    "ANTHROPIC_BASE_URL": "${apiBaseUrl}",
    "ANTHROPIC_MODEL": "Opus 4.8",
    "ANTHROPIC_SMALL_FAST_MODEL": "Haiku 4.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "Sonnet 4.6",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "Opus 4.8",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "Haiku 4.5",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "hasCompletedOnboarding": true
}`}
      />
    </div>

    {/* Cursor */}
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold border border-border text-primary bg-secondary/40 px-2.5 py-1 rounded-lg">
          Cursor
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        In Cursor settings, set Base URL and model:
      </p>
      <div className="space-y-2 text-sm font-mono">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
          <span className="text-muted-foreground text-xs w-20 shrink-0">Base URL</span>
          <code className="text-primary font-semibold">{apiBaseUrl}/v1</code>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
          <span className="text-muted-foreground text-xs w-20 shrink-0">Model</span>
          <code className="text-primary font-semibold">claude-sonnet-4-6</code>
        </div>
      </div>
    </div>

    {/* Windsurf */}
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold border border-border text-primary bg-secondary/40 px-2.5 py-1 rounded-lg">
          Windsurf
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        In Windsurf settings, set the Base URL:
      </p>
      <CodeBlock
        lang="text"
        code={`${apiBaseUrl}/v1`}
      />
    </div>

    {/* Cline / Roo Code */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold border border-border text-primary bg-secondary/40 px-2.5 py-1 rounded-lg">
          Cline
        </span>
        <span className="text-xs text-muted-foreground">Roo Code</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Add to your VS Code{" "}
        <code className="text-xs font-mono bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium">
          settings.json
        </code>{" "}
        with provider{" "}
        <code className="text-xs font-mono bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium">
          "anthropic"
        </code>
        , your base URL, and API key.
      </p>
    </div>
  </Section>

  {/* ── API Reference ─────────────────────────────────────── */}
  <Section id="api-reference" title="API Reference">

    {/* Authentication */}
    <div className="mb-8">
      <h3 className="text-base font-semibold text-foreground mb-3">
        Authentication
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Pass your API key using either header:
      </p>
      <div className="space-y-2">
        <CodeBlock
          lang="http"
          code={`x-api-key: YOUR_API_KEY`}
        />
        <CodeBlock
          lang="http"
          code={`Authorization: Bearer YOUR_API_KEY`}
        />
      </div>
    </div>

    {/* Endpoints */}
    <div className="space-y-4">
      {[
        {
          method: "POST",
          path: "/api/v1/messages",
          desc: "Create a message. Set stream: true for Server-Sent Events with message_start, content_block_delta, and message_stop events.",
          body: `{ "model": "claude-opus-4-8", "messages": [{ "role": "user", "content": "Hello" }], "max_tokens": 1024, "stream": false }`,
        },
        {
          method: "GET",
          path: "/api/v1/models",
          desc: "List all available models with context window information.",
          body: null,
        },
        {
          method: "POST",
          path: "/api/v1/messages/count_tokens",
          desc: "Count tokens without sending a message.",
          body: `{ "model": "claude-opus-4-8", "messages": [{ "role": "user", "content": "Hello" }] }`,
        },
        {
          method: "GET",
          path: "/api/key-status?key=YOUR_API_KEY",
          desc: "Check your key status, current usage, and rate limit windows.",
          body: null,
        },
      ].map((ep) => (
        <div
          key={ep.path}
          className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`text-xs font-bold px-2 py-1 rounded-md ${
                ep.method === "GET"
                  ? "bg-secondary text-primary font-semibold"
                  : "bg-primary text-primary-foreground font-semibold"
              }`}
            >
              {ep.method}
            </span>
            <code className="text-sm font-mono text-foreground font-semibold">
              {ep.path}
            </code>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{ep.desc}</p>
          {ep.body && <CodeBlock lang="json" code={ep.body} />}
        </div>
      ))}
    </div>
  </Section>

  {/* ── Models ─────────────────────────────────────────────── */}
  <Section id="models" title="Models">
    <p className="text-muted-foreground mb-6 leading-relaxed">
      All models are Anthropic-compatible and work with standard
      Anthropic SDK calls. Just set the model ID in your requests.
    </p>
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-secondary/60 border-b border-border">
              <th className="text-left px-5 py-3 font-semibold text-foreground">
                Model
              </th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">
                Model ID
              </th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">
                Context
              </th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">
                Type
              </th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {models.length > 0 &&
              models.map((model) => (
                <tr key={model.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-foreground">
                        {model.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs font-mono text-primary bg-secondary px-1.5 py-0.5 rounded font-medium">
                      {model.id}
                    </code>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {model.context} tokens
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold text-primary">
                      {model.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {model.created || "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  </Section>

  {/* ── Built-in Tools ────────────────────────────────────── */}
  <Section id="built-in-tools" title="Built-in Tools">
    <p className="text-muted-foreground mb-6 leading-relaxed">
      Web search and image analysis are available server-side — no
      client-side MCP setup or additional configuration required.
    </p>
    <div className="space-y-4">
      {[
        {
          icon: "🔍",
          title: "Web Search",
          endpoint: "POST /tools/web_search",
          desc: "Real-time web search powered by OpusZen. Use 3–5 focused keywords for best results.",
          example: `{ "query": "latest Anthropic API updates 2026" }`,
        },
        {
          icon: "🖼️",
          title: "Image Analysis",
          endpoint: "POST /tools/understand_image",
          desc: "Analyze images via HTTP URLs, local file paths, or base64-encoded data. Max file size: 18MB.",
          example: `{ "image": "https://example.com/photo.jpg" }`,
        },
      ].map((tool) => (
        <div
          key={tool.endpoint}
          className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl" aria-hidden="true">
              {tool.icon}
            </span>
            <h3 className="text-base font-semibold text-foreground">
              {tool.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
          <CodeBlock lang="http" code={tool.endpoint} />
          <div className="mt-3">
            <CodeBlock lang="json" code={tool.example} />
          </div>
        </div>
      ))}
    </div>
  </Section>

  {/* ── Troubleshooting ──────────────────────────────────────── */}
  <Section id="troubleshooting" title="Troubleshooting">
    <div className="space-y-4">
      {[
        {
          problem: "Connection errors",
          solution:
            "Check the key is active and not expired on the Check Usage page.",
        },
        {
          problem: "Web search or image tools not firing",
          solution:
            "They are server-side and always on. If they seem inactive, the key is usually the problem, not the config.",
        },
        {
          problem: "Model not found",
          solution:
            "Use an exact ID from the models list above, or a friendly alias.",
        },
        {
          problem: "Rate limited",
          solution:
            "Your five-hour window may be spent. Check /api/key-status for the reset time.",
        },
        {
          problem: "Changes not applying",
          solution:
            "Restart the editor after any config change.",
        },
        {
          problem: "Cursor or Windsurf not routing",
          solution:
            "Make sure the URL you pasted ends in /v1.",
        },
      ].map((item) => (
        <div
          key={item.problem}
          className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors"
        >
          <div className="shrink-0 mt-0.5">
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {item.problem}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.solution}
            </p>
          </div>
        </div>
      ))}
    </div>

    {/* Still stuck */}
    <div className="mt-8 p-6 rounded-2xl bg-secondary/60 border border-border text-center">
      <p className="text-sm text-primary font-semibold mb-1">
        Still stuck?
      </p>
      <p className="text-xs text-muted-foreground">
        Contact your admin or reseller for key-specific support.
      </p>
    </div>
  </Section>

  {/* Bottom spacing */}
  <div className="h-8" />
  </div>
  </div>
  </div>
  </Layout>
 );
}
