import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Skull, ArrowUpRight, Activity, Crosshair, FileSearch } from "lucide-react";
import { generateAutopsy, type AutopsyResult } from "@/lib/mock-autopsy";
import { AutopsyResults } from "@/components/AutopsyResults";
import { analyzeWithGemini, type GeminiAnalysis } from "@/lib/gemini-autopsy.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Startup Autopsy — Learn from startup failures and successes" },
      { name: "description", content: "Evaluate your startup idea by learning from similar startups that succeeded or failed." },
      { property: "og:title", content: "Startup Autopsy" },
      { property: "og:description", content: "Learn from startup failures and successes before you build." },
    ],
  }),
  component: Index,
});

function Index() {
  const [idea, setIdea] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState("");
  const [result, setResult] = useState<AutopsyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [gemini, setGemini] = useState<GeminiAnalysis | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const runGemini = useServerFn(analyzeWithGemini);

  const handleAnalyze = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setSubmittedIdea(idea);
    setGemini(null);
    setGeminiError(null);
    try {
      const r = await generateAutopsy(idea);
      setResult(r);
      setGeminiLoading(true);
      runGemini({
        data: {
          idea,
          category: r.category,
          successes: r.hallOfSurvivors.map((s) => ({
            name: s.name, industry: s.industry, status: "Success" as const,
            description: s.quote, reason: s.survivalTrait, tags: [], fundingRaised: s.fundingRaised,
          })),
          failures: r.graveyard.map((g) => ({
            name: g.name, industry: g.industry, status: "Failure" as const,
            description: g.epitaph, reason: g.causeOfDeath, tags: [], fundingRaised: g.fundingRaised,
          })),
        },
      })
        .then((g) => setGemini(g))
        .catch((e) => setGeminiError(e instanceof Error ? e.message : "Gemini analysis failed"))
        .finally(() => setGeminiLoading(false));
    } catch (err) {
      console.error("autopsy failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return <AutopsyResults result={result} idea={submittedIdea} gemini={gemini} geminiLoading={geminiLoading} geminiError={geminiError} onReset={() => { setResult(null); setIdea(""); setGemini(null); setGeminiError(null); }} />;
  }

  const ticker = [
    "Quibi · $1.75B raised · died at 6mo",
    "Theranos · $945M raised · fraud",
    "Juicero · $120M raised · the press was the joke",
    "Pets.com · $300M raised · 9 months public",
    "WeWork · $22B burned · IPO collapsed",
    "Friendster · 115M users · gone",
    "Webvan · $800M raised · 2yr lifespan",
    "Beepi · $150M raised · vanished",
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-danger)" }}>
            <Skull className="h-4 w-4 text-ivory" style={{ color: "var(--ivory)" }} />
          </div>
          <span className="font-display text-lg tracking-tight">Startup Autopsy</span>
          <span className="ml-2 hidden md:inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Intelligence
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#analyze" className="hover:text-foreground transition">Analyze</a>
          <a href="#method" className="hover:text-foreground transition">Method</a>
          <a href="#archive" className="hover:text-foreground transition">Archive</a>
        </nav>
        <a
          href="#analyze"
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-foreground hover:bg-white/[0.06] transition"
        >
          Begin examination <ArrowUpRight className="h-3 w-3" />
        </a>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 md:pt-24 pb-16">
        <div className="animate-float-up text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse-danger" style={{ background: "var(--danger)" }} />
            Forensic intelligence for founders
          </div>

          <h1 className="mt-8 font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.04em]">
            <span className="block">The post-mortem</span>
            <span className="block italic">
              <span className="text-gradient-danger">your startup</span>
            </span>
            <span className="block">will wish it had.</span>
          </h1>

          <p className="mt-8 mx-auto max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Before you write a line of code, examine the ventures that came before you —
            the ones that died, and the rare few that survived.
          </p>
        </div>

        {/* Input card */}
        <div id="analyze" className="mt-16 mx-auto max-w-3xl animate-float-up" style={{ animationDelay: "120ms" }}>
          <div className="relative rounded-3xl glass-strong p-1.5 shadow-2xl">
            <div className="rounded-[20px] bg-background/40 p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <FileSearch className="h-3 w-3" />
                  Case intake
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} />
                </div>
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="A subscription tool that helps independent clinics automate patient follow-ups…"
                rows={4}
                className="w-full resize-none rounded-2xl bg-transparent px-1 py-2 text-lg md:text-xl font-display text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
              />
              <div className="mt-6 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground font-mono">
                  Compared against 2,400+ documented venture deaths and survivors.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !idea.trim()}
                  className="group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-background disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  style={{ background: "var(--ivory)", color: "var(--background)" }}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Performing autopsy…</>
                  ) : (
                    <>Begin examination <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Failed ventures ticker */}
        <div id="archive" className="mt-24 relative">
          <div className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
            From the archive
          </div>
          <div className="relative overflow-hidden mask-fade-x" style={{ maskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)" }}>
            <div className="flex gap-12 animate-marquee whitespace-nowrap">
              {[...ticker, ...ticker].map((t, i) => (
                <span key={i} className="font-mono text-sm text-muted-foreground/70 flex items-center gap-3">
                  <Skull className="h-3 w-3" style={{ color: "var(--danger)" }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Method */}
        <section id="method" className="mt-28 grid gap-px md:grid-cols-3 rounded-3xl overflow-hidden glass">
          {[
            {
              icon: Skull,
              kicker: "01",
              title: "The Graveyard",
              desc: "Inspect ventures that died in your category. Cause of death, funding burned, time on the table.",
              tone: "danger",
            },
            {
              icon: Activity,
              kicker: "02",
              title: "Cause of Death",
              desc: "Pathology grouped into PMF, cash burn, competition, team, and distribution failure.",
              tone: "neutral",
            },
            {
              icon: Crosshair,
              kicker: "03",
              title: "Survival Odds",
              desc: "A probability score and the precise reasons your idea resembles the living — or the dead.",
              tone: "success",
            },
          ].map((f) => (
            <div key={f.title} className="bg-background/40 p-8 md:p-10 hover:bg-background/60 transition">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground tracking-widest">{f.kicker}</span>
                <f.icon
                  className="h-4 w-4"
                  style={{ color: f.tone === "danger" ? "var(--danger)" : f.tone === "success" ? "var(--success)" : "var(--accent)" }}
                />
              </div>
              <h3 className="mt-8 font-display text-3xl tracking-tight">{f.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        <footer className="mt-24 flex items-center justify-between text-xs text-muted-foreground font-mono pb-4">
          <span>© Startup Autopsy</span>
          <span>v1.0 · est. cause of death index</span>
        </footer>
      </main>
    </div>
  );
}
