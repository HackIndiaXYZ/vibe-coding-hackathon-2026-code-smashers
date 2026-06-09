import {
  retrieveRelevantStartups,
  type ScoredStartup,
  type StartupRecord,
} from "@/lib/startup-db";

type CauseCategory = "Product Market Fit" | "Cash Burn" | "Competition" | "Team Issues" | "Marketing Failure";

export type AutopsyResult = {
  summary: string;
  category: string;
  riskScore: number;
  survivalProbability: number;
  timeOfDeath: string;
  similarStartups: {
    name: string;
    industry: string;
    status: "Success" | "Failure";
    description: string;
  }[];
  graveyard: {
    name: string;
    industry: string;
    founded: number;
    died: number;
    fundingRaised: string;
    causeOfDeath: string;
    epitaph: string;
  }[];
  hallOfSurvivors: {
    name: string;
    industry: string;
    founded: number;
    valuation: string;
    fundingRaised: string;
    survivalTrait: string;
    quote: string;
  }[];
  causeOfDeathCategories: {
    category: CauseCategory;
    percentage: number;
    description: string;
  }[];
  resemblance: {
    failureSignals: { startup: string; reason: string }[];
    successSignals: { startup: string; reason: string }[];
  };
  successPatterns: string[];
  failurePatterns: string[];
  recommendations: string[];
  successVsFailure: { name: string; value: number; color: string }[];
  failureReasons: { reason: string; count: number }[];
  riskRadar: { dimension: string; score: number }[];
};

const CAUSE_DESCRIPTIONS: Record<CauseCategory, string> = {
  "Product Market Fit": "The offer did not become a repeated habit, or the core technology never delivered enough value.",
  "Cash Burn": "Capital was spent faster than the model proved repeatable unit economics.",
  Competition: "Incumbents, faster followers, or substitutes captured the market before defensibility formed.",
  "Team Issues": "Governance, founder judgment, quality control, or execution gaps became fatal.",
  "Marketing Failure": "Demand generation could not support the business model at a sustainable cost.",
};

const CATEGORY_KEYWORDS: Record<CauseCategory, string[]> = {
  "Product Market Fit": ["product-market", "pmf", "nobody asked", "no real problem", "never worked", "validating demand", "repeat-usage", "demand"],
  "Cash Burn": ["burn", "spending", "cash", "funded", "warehouse", "infrastructure", "unit economics", "cac", "ltv", "liabilities"],
  Competition: ["compet", "outcompeted", "incumbent", "race", "copied", "pushed users", "facebook", "apple", "fitbit"],
  "Team Issues": ["fraud", "governance", "leadership", "founder", "burnout", "quality", "trust"],
  "Marketing Failure": ["seo", "acquisition", "marketing", "invisible", "distribution", "launched", "commute", "users"],
};

function classifyCause(reason: string): CauseCategory {
  const lower = reason.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CauseCategory, string[]][]) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return "Product Market Fit";
}

function cleanMatchedTerms(scored: ScoredStartup): string {
  return scored.matchedTerms.length > 0
    ? `Matched signals: ${scored.matchedTerms.slice(0, 4).join(", ")}.`
    : "Included as a benchmark because the database has limited direct comparables for this category.";
}

function makeEpitaph(startup: StartupRecord): string {
  const category = classifyCause(startup.reason);
  if (category === "Cash Burn") return "Capital could not outrun the economics.";
  if (category === "Competition") return "The market moved faster than its moat.";
  if (category === "Team Issues") return "The execution layer failed before the thesis could breathe.";
  if (category === "Marketing Failure") return "Distribution collapsed before demand compounded.";
  return "A promising thesis, but not a repeated need.";
}

function makeSurvivalQuote(startup: StartupRecord): string {
  const tags = startup.tags.slice(0, 2).join(" + ");
  return tags ? `The autopsy says: ${tags} became leverage, not decoration.` : "Survival came from a sharper wedge than the market expected.";
}

function buildCauseDistribution(failures: ScoredStartup[]) {
  const counts = new Map<CauseCategory, number>();
  for (const match of failures) {
    const category = classifyCause(match.startup.reason);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const total = Math.max(1, failures.length);
  const categories = (Object.keys(CAUSE_DESCRIPTIONS) as CauseCategory[]).map((category) => ({
    category,
    percentage: Math.round(((counts.get(category) ?? 0) / total) * 100),
    description: CAUSE_DESCRIPTIONS[category],
  }));

  const remainder = 100 - categories.reduce((sum, c) => sum + c.percentage, 0);
  categories[0].percentage += remainder;
  return categories;
}

function getAverageLifespan(failures: ScoredStartup[]): string {
  const lifespans = failures
    .map(({ startup }) => startup.yearClosed ? startup.yearClosed - startup.yearFounded : null)
    .filter((lifespan): lifespan is number => typeof lifespan === "number" && lifespan > 0);
  if (lifespans.length === 0) return "T+18 to T+36 months";
  const avg = Math.round(lifespans.reduce((sum, lifespan) => sum + lifespan, 0) / lifespans.length);
  return `T+${Math.max(1, avg - 1)} to T+${avg + 1} years`;
}

function uniqueList(items: string[], limit = 5): string[] {
  return Array.from(new Set(items)).slice(0, limit);
}

export async function generateAutopsy(idea: string): Promise<AutopsyResult> {
  const trimmed = idea.trim() || "Your startup idea";
  const retrieved = await retrieveRelevantStartups(trimmed, 4);
  const failures = retrieved.failures;
  const successes = retrieved.successes;
  const totalFailureScore = failures.reduce((sum, match) => sum + match.score, 0);
  const totalSuccessScore = successes.reduce((sum, match) => sum + match.score, 0);
  const capitalAtRisk = failures.reduce((sum, match) => sum + match.startup.fundingRaisedUsd, 0);
  const risk = Math.min(95, Math.max(12, 42 + totalFailureScore * 3 - totalSuccessScore * 2 + Math.min(18, Math.round(capitalAtRisk / 1_000_000_000))));
  const survivalProbability = Math.min(92, Math.max(8, 100 - risk));
  const causeCategories = buildCauseDistribution(failures);
  const leadingCause = [...causeCategories].sort((a, b) => b.percentage - a.percentage)[0];

  return {
    summary: `CASE FILE: "${trimmed}". Classified as ${retrieved.category}. The database returned ${successes.length} surviving comparables and ${failures.length} failed comparables. The strongest pathology cluster is ${leadingCause.category.toLowerCase()}, and the evidence below is generated from the matched startup records rather than a static template.`,
    category: retrieved.category,
    riskScore: risk,
    survivalProbability,
    timeOfDeath: getAverageLifespan(failures),
    similarStartups: [...failures, ...successes]
      .sort((a, b) => b.score - a.score)
      .map(({ startup }) => ({
        name: startup.name,
        industry: startup.industry,
        status: startup.status,
        description: startup.description,
      })),
    graveyard: failures.map(({ startup }) => ({
      name: startup.name,
      industry: startup.industry,
      founded: startup.yearFounded,
      died: startup.yearClosed ?? new Date().getFullYear(),
      fundingRaised: startup.fundingRaised,
      causeOfDeath: startup.reason,
      epitaph: makeEpitaph(startup),
    })),
    hallOfSurvivors: successes.map(({ startup }) => ({
      name: startup.name,
      industry: startup.industry,
      founded: startup.yearFounded,
      valuation: "Surviving benchmark",
      fundingRaised: startup.fundingRaised,
      survivalTrait: startup.reason,
      quote: makeSurvivalQuote(startup),
    })),
    causeOfDeathCategories: causeCategories,
    resemblance: {
      failureSignals: failures.slice(0, 3).map((match) => ({
        startup: match.startup.name,
        reason: `Your idea overlaps with ${match.startup.industry}. ${cleanMatchedTerms(match)} Failure record: ${match.startup.reason}`,
      })),
      successSignals: successes.slice(0, 3).map((match) => ({
        startup: match.startup.name,
        reason: `Your idea also resembles a survivor in ${match.startup.industry}. ${cleanMatchedTerms(match)} Survival record: ${match.startup.reason}`,
      })),
    },
    successPatterns: uniqueList(successes.flatMap(({ startup }) => [
      startup.reason,
      `Relevant tags: ${startup.tags.slice(0, 3).join(", ")}`,
    ])),
    failurePatterns: uniqueList(failures.flatMap(({ startup }) => [
      startup.reason,
      `Failure category: ${classifyCause(startup.reason)}`,
    ])),
    recommendations: [
      `Start with the narrowest ${retrieved.category.toLowerCase()} wedge where one matched survivor proved demand, then validate retention before scaling.`,
      `Study ${failures[0]?.startup.name}: design an explicit test that proves your idea will not die from the same cause — ${failures[0]?.startup.reason}`,
      `Borrow from ${successes[0]?.startup.name}: make the winning mechanism measurable in your first month — ${successes[0]?.startup.reason}`,
      "Do not raise or spend like the largest failed comparable until unit economics are visible in a small cohort.",
      "Re-run the autopsy whenever the idea changes; different positioning should produce different comparable companies.",
    ],
    successVsFailure: [
      { name: "Success", value: successes.length, color: "var(--color-chart-1)" },
      { name: "Failure", value: failures.length, color: "var(--color-chart-4)" },
    ],
    failureReasons: causeCategories
      .filter((c) => c.percentage > 0)
      .map((c) => ({ reason: c.category.replace("Product Market Fit", "No PMF"), count: c.percentage })),
    riskRadar: [
      { dimension: "Market", score: Math.min(95, 35 + totalFailureScore * 5) },
      { dimension: "Competition", score: causeCategories.find((c) => c.category === "Competition")?.percentage ?? 15 },
      { dimension: "Execution", score: Math.min(95, 45 + failures.filter((m) => classifyCause(m.startup.reason) === "Team Issues").length * 18) },
      { dimension: "Monetization", score: Math.min(95, 35 + failures.filter((m) => classifyCause(m.startup.reason) === "Cash Burn").length * 20) },
      { dimension: "Defensibility", score: Math.min(95, 70 - Math.min(35, totalSuccessScore * 3) + totalFailureScore * 2) },
      { dimension: "Team", score: Math.min(95, 40 + failures.filter((m) => classifyCause(m.startup.reason) === "Team Issues").length * 15) },
    ],
  };
}