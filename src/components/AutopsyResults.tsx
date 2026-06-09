import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { useMemo } from "react";
import {
  Skull, HeartPulse, TrendingUp, ArrowLeft, FileText, Lightbulb, Loader2, Sparkles, AlertTriangle,
  Activity, Crosshair, Quote,
} from "lucide-react";
import type { AutopsyResult } from "@/lib/mock-autopsy";
import type { GeminiAnalysis } from "@/lib/gemini-autopsy.functions";

const DANGER = "oklch(0.62 0.22 25)";
const SUCCESS = "oklch(0.74 0.16 155)";
const GOLD = "oklch(0.82 0.12 85)";
const IVORY = "oklch(0.97 0.006 80)";

const CAUSE_COLORS: Record<string, string> = {
  "Product Market Fit": DANGER,
  "Cash Burn": "oklch(0.72 0.18 45)",
  "Competition": "oklch(0.70 0.18 320)",
  "Team Issues": "oklch(0.70 0.14 220)",
  "Marketing Failure": GOLD,
};

function survivalTone(score: number) {
  if (score >= 65) return { label: "Vital Signs Strong", color: SUCCESS, ring: "var(--gradient-success)" };
  if (score >= 35) return { label: "Critical Condition", color: GOLD, ring: "linear-gradient(135deg, oklch(0.82 0.12 85), oklch(0.65 0.14 60))" };
  return { label: "Flatlining", color: DANGER, ring: "var(--gradient-danger)" };
}

function ForensicTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl glass-strong px-3.5 py-2.5 text-xs shadow-2xl">
      {label && <div className="font-display text-foreground mb-1.5 text-sm">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium text-foreground ml-auto">{p.value}{suffix ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ kicker, title, accent, icon: Icon }: { kicker: string; title: string; accent: string; icon: React.ComponentType<any> }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
          <span>{kicker}</span>
          <span className="h-px w-8" style={{ background: accent }} />
        </div>
        <h2 className="mt-3 font-display text-4xl md:text-5xl tracking-[-0.03em] flex items-center gap-3">
          <Icon className="h-7 w-7" style={{ color: accent }} />
          {title}
        </h2>
      </div>
    </div>
  );
}

export function AutopsyResults({ result, idea, onReset, gemini, geminiLoading, geminiError }: {
  result: AutopsyResult;
  idea: string;
  onReset: () => void;
  gemini?: GeminiAnalysis | null;
  geminiLoading?: boolean;
  geminiError?: string | null;
}) {
  // Single source of truth: Gemini's survivalProbability.
  // No fallbacks, no heuristics, no category defaults.
  const survivalProbability = gemini?.survivalProbability ?? null;
  const mortalityRisk = survivalProbability == null ? null : 100 - survivalProbability;
  const survival = survivalTone(survivalProbability ?? 50);
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log({
      survivalProbability,
      mortalityRisk,
      analysis: gemini,
    });
  }
  const riskRadarData = gemini
    ? [
        { dimension: "Market", score: gemini.marketRisk },
        { dimension: "Execution", score: gemini.executionRisk },
        { dimension: "Funding", score: gemini.fundingRisk },
        { dimension: "Competition", score: gemini.competitionRisk },
      ]
    : result.riskRadar;
  const reportId = useMemo(() => `SA-${(idea.length * 7919).toString(36).toUpperCase().slice(0, 6)}`, [idea]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const deaths = result.graveyard.length;
  const survivors = result.hallOfSurvivors.length;

  return (
    <div className="relative min-h-screen">
      {/* Sticky case bar */}
      <div className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" /> New case
          </button>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono text-muted-foreground">
            <span>FILE <span className="text-foreground">{reportId}</span></span>
            <span>CATEGORY <span className="text-foreground">{result.category}</span></span>
            <span>EXAM <span className="text-foreground">{today}</span></span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse-danger" style={{ background: DANGER }} />
              <span className="text-foreground">Live</span>
            </span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            <span style={{ color: survival.color }}>
              {survivalProbability == null ? "—" : `${survivalProbability}%`}
            </span>{" "}
            survival
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:py-20 space-y-28">
        {/* HERO: the verdict */}
        <section className="animate-float-up">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
            <FileText className="h-3 w-3" />
            <span>Autopsy Report · {reportId}</span>
          </div>

          <h1 className="mt-6 font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.04em]">
            The verdict on
            <span className="block italic mt-1">
              <span className="text-gradient">your venture</span>.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            <span className="italic font-display text-foreground">"{idea}"</span>
          </p>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground/90 leading-relaxed">
            {result.summary}
          </p>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden glass">
            {[
              { k: "Category", v: result.category, tone: IVORY, small: true },
              { k: "Confirmed deaths", v: deaths, tone: DANGER },
              { k: "Survivors", v: survivors, tone: SUCCESS },
              { k: "Mortality risk", v: mortalityRisk == null ? "—" : `${mortalityRisk}/100`, tone: GOLD },
            ].map((s) => (
              <div key={s.k} className="bg-background/40 p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">{s.k}</div>
                <div className={`mt-3 font-display tracking-tight ${s.small ? "text-lg md:text-xl" : "text-3xl md:text-4xl"}`} style={{ color: s.tone }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GEMINI AI ANALYSIS */}
        <section>
          <SectionHeader kicker="Section 00" title="AI Forensic Analysis" accent={GOLD} icon={Sparkles} />
          {geminiLoading && (
            <div className="glass rounded-2xl p-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: GOLD }} />
              Gemini is examining the matched startups…
            </div>
          )}
          {geminiError && !geminiLoading && (
            <div className="glass-danger rounded-2xl p-6 flex items-start gap-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: DANGER }} />
              <div>
                <div className="font-display text-base text-foreground">AI analysis unavailable</div>
                <p className="text-xs text-muted-foreground mt-1">{geminiError}</p>
              </div>
            </div>
          )}
          {gemini && !geminiLoading && (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">Gemini Survival Probability</div>
                  <div className="mt-1 font-display text-4xl" style={{ color: survivalTone(gemini.survivalProbability).color }}>
                    {gemini.survivalProbability}<span className="text-base text-muted-foreground">/100</span>
                  </div>
                </div>
                <p className="text-sm italic text-foreground/85 max-w-xl leading-relaxed">
                  <Quote className="inline h-3 w-3 mr-1" style={{ color: GOLD }} />
                  {gemini.finalVerdict}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: "Cause of Death Analysis", body: gemini.causeOfDeathAnalysis, color: DANGER },
                  { title: "Lessons from Survivors", body: gemini.lessonsFromSurvivors, color: SUCCESS },
                  { title: "Competitive Threats", body: gemini.competitiveThreats, color: DANGER },
                  { title: "Business Model Risks", body: gemini.businessModelRisks, color: GOLD },
                ].map((card) => (
                  <div key={card.title} className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: card.color }} />
                      <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{card.title}</h3>
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{card.body}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4" style={{ color: GOLD }} />
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Recommended Improvements</h3>
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{gemini.recommendedImprovements}</p>
              </div>
            </div>
          )}
        </section>

        {/* SURVIVAL ODDS — cinematic */}
        <section>
          <SectionHeader kicker="Section 01" title="Survival Odds" accent={survival.color} icon={HeartPulse} />

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5">
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 rounded-full blur-3xl opacity-30" style={{ background: survival.ring }} />
                <svg viewBox="0 0 200 200" className="relative w-full h-full -rotate-90">
                  <defs>
                    <linearGradient id="surv-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={survival.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={survival.color} stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="100" r="88" fill="none" stroke="oklch(1 0 0 / 0.05)" strokeWidth="6" />
                  <circle
                    cx="100" cy="100" r="88" fill="none"
                    stroke="url(#surv-grad)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${((survivalProbability ?? 0) / 100) * 553} 553`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">Probability</div>
                  <div className="mt-2 font-display text-7xl md:text-8xl tracking-[-0.04em]" style={{ color: survival.color }}>
                    {survivalProbability == null ? "—" : survivalProbability}
                    <span className="text-3xl text-muted-foreground">%</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-mono"
                    style={{ background: `color-mix(in oklab, ${survival.color} 15%, transparent)`, color: survival.color }}>
                    <HeartPulse className="h-3 w-3" /> {survival.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid gap-4 md:grid-cols-2">
              <div className="glass-danger rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skull className="h-4 w-4" style={{ color: DANGER }} />
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: DANGER }}>Resembles the dead</h3>
                </div>
                <ul className="space-y-4">
                  {result.resemblance.failureSignals.map(s => (
                    <li key={s.startup}>
                      <div className="font-display text-base text-foreground">{s.startup}</div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-success rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4" style={{ color: SUCCESS }} />
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: SUCCESS }}>Resembles the living</h3>
                </div>
                <ul className="space-y-4">
                  {result.resemblance.successSignals.map(s => (
                    <li key={s.startup}>
                      <div className="font-display text-base text-foreground">{s.startup}</div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* STARTUP GRAVEYARD */}
        <section>
          <SectionHeader kicker="Section 02" title="Startup Graveyard" accent={DANGER} icon={Skull} />
          <p className="-mt-4 mb-8 max-w-2xl text-sm text-muted-foreground">
            Ventures buried in your category. Each tombstone is a lesson paid for in capital and years.
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            {result.graveyard.map((g) => {
              const lifespan = g.died - g.founded;
              return (
                <article key={g.name} className="group relative rounded-2xl glass-danger p-7 transition hover:-translate-y-0.5 overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition" style={{ background: DANGER }} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-mono" style={{ color: DANGER }}>
                          <Skull className="h-3 w-3" /> Deceased
                        </div>
                        <h3 className="mt-2 font-display text-3xl tracking-tight">{g.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{g.industry}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-foreground/80">{g.founded} — {g.died}</div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">{lifespan} yr lifespan</div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">Funding raised</div>
                        <div className="mt-1 font-display text-lg text-foreground">{g.fundingRaised}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">Time of death</div>
                        <div className="mt-1 font-display text-lg" style={{ color: DANGER }}>T+{lifespan}y</div>
                      </div>
                    </div>

                    <div className="mt-5 pt-5 border-t border-white/[0.06]">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono mb-2">Cause of death</div>
                      <p className="text-sm text-foreground/85 leading-relaxed">{g.causeOfDeath}</p>
                    </div>

                    <p className="mt-5 flex gap-2 items-start text-xs italic text-muted-foreground">
                      <Quote className="h-3 w-3 shrink-0 mt-1" style={{ color: DANGER }} />
                      <span>{g.epitaph}</span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* CAUSE OF DEATH ANALYSIS */}
        <section>
          <SectionHeader kicker="Section 03" title="Cause of Death Analysis" accent={DANGER} icon={Activity} />

          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-3">
              {result.causeOfDeathCategories.map(c => (
                <div key={c.category} className="glass rounded-2xl p-5 transition hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAUSE_COLORS[c.category] }} />
                      <h3 className="font-display text-xl tracking-tight">{c.category}</h3>
                    </div>
                    <div className="font-mono text-2xl font-medium tracking-tight" style={{ color: CAUSE_COLORS[c.category] }}>
                      {c.percentage}<span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${c.percentage}%`, background: `linear-gradient(90deg, ${CAUSE_COLORS[c.category]}, color-mix(in oklab, ${CAUSE_COLORS[c.category]} 60%, transparent))` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{c.description}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2">
              <div className="glass rounded-2xl p-6 h-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display text-xl">Pathology Distribution</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Share of total deaths by primary cause.</p>
                <div className="h-72">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={result.causeOfDeathCategories}
                        dataKey="percentage"
                        nameKey="category"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {result.causeOfDeathCategories.map((c) => (
                          <Cell key={c.category} fill={CAUSE_COLORS[c.category]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ForensicTooltip suffix="%" />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HALL OF SURVIVORS */}
        <section>
          <SectionHeader kicker="Section 04" title="Hall of Survivors" accent={SUCCESS} icon={TrendingUp} />
          <p className="-mt-4 mb-8 max-w-2xl text-sm text-muted-foreground">
            The rare ventures that made it. Study what they did differently — these are the patterns worth borrowing.
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            {result.hallOfSurvivors.map((s) => (
              <article key={s.name} className="group relative rounded-2xl glass-success p-7 transition hover:-translate-y-0.5 overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-25 group-hover:opacity-50 transition" style={{ background: SUCCESS }} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-mono" style={{ color: SUCCESS }}>
                        <TrendingUp className="h-3 w-3" /> Survived
                      </div>
                      <h3 className="mt-2 font-display text-3xl tracking-tight">{s.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.industry}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm text-foreground/80">est. {s.founded}</div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">{new Date().getFullYear() - s.founded} yrs alive</div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">Valuation</div>
                      <div className="mt-1 font-display text-lg" style={{ color: SUCCESS }}>{s.valuation}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">Capital deployed</div>
                      <div className="mt-1 font-display text-lg text-foreground">{s.fundingRaised}</div>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-white/[0.06]">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono mb-2">Survival trait</div>
                    <p className="text-sm text-foreground/85 leading-relaxed">{s.survivalTrait}</p>
                  </div>

                  <p className="mt-5 flex gap-2 items-start text-xs italic text-muted-foreground">
                    <Quote className="h-3 w-3 shrink-0 mt-1" style={{ color: SUCCESS }} />
                    <span>{s.quote}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FORENSIC CHARTS */}
        <section>
          <SectionHeader kicker="Section 05" title="Forensic Charts" accent={GOLD} icon={Crosshair} />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-display text-xl mb-1">Top failure reasons</h3>
              <p className="text-xs text-muted-foreground mb-4">Recorded across the historical dataset.</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={result.failureReasons} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid stroke="oklch(1 0 0 / 0.05)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="oklch(1 0 0 / 0.4)" fontSize={11} />
                    <YAxis type="category" dataKey="reason" stroke="oklch(1 0 0 / 0.4)" fontSize={11} width={100} />
                    <Tooltip content={<ForensicTooltip suffix="%" />} cursor={{ fill: "oklch(1 0 0 / 0.03)" }} />
                    <Bar dataKey="count" fill={DANGER} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-display text-xl mb-1">Risk radar</h3>
              <p className="text-xs text-muted-foreground mb-4">Vulnerability assessment across six dimensions.</p>
              <div className="h-72">
                <ResponsiveContainer>
                  <RadarChart data={riskRadarData}>
                    <defs>
                      <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={DANGER} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={GOLD} stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="oklch(1 0 0 / 0.08)" />
                    <PolarAngleAxis dataKey="dimension" stroke="oklch(1 0 0 / 0.5)" fontSize={11} />
                    <PolarRadiusAxis stroke="oklch(1 0 0 / 0.05)" tick={false} axisLine={false} />
                    <Radar name="Risk" dataKey="score" stroke={DANGER} fill="url(#radar-fill)" fillOpacity={1} strokeWidth={1.5} />
                    <Tooltip content={<ForensicTooltip suffix=" / 100" />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* PRESCRIPTION */}
        <section>
          <SectionHeader kicker="Section 06" title="Prescription" accent={GOLD} icon={Lightbulb} />

          <div className="grid gap-px md:grid-cols-2 rounded-2xl overflow-hidden glass">
            {result.recommendations.map((r, i) => (
              <div key={i} className="bg-background/40 p-7 hover:bg-background/60 transition">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-4xl" style={{ color: GOLD }}>{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-sm text-foreground/85 leading-relaxed">{r}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-8 flex items-center justify-between flex-wrap gap-4 text-xs font-mono text-muted-foreground border-t border-border/60">
          <span>End of report · {reportId}</span>
          <button onClick={onReset} className="inline-flex items-center gap-2 hover:text-foreground transition">
            <ArrowLeft className="h-3 w-3" /> Examine another venture
          </button>
        </footer>
      </div>
    </div>
  );
}