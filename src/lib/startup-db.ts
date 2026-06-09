import { supabase } from "@/integrations/supabase/client";

export type StartupStatus = "Success" | "Failure";

export type StartupRecord = {
  name: string;
  industry: string;
  status: StartupStatus;
  fundingRaised: string;
  fundingRaisedUsd: number;
  yearFounded: number;
  yearClosed: number | null;
  reason: string;
  description: string;
  tags: string[];
};

let cache: StartupRecord[] | null = null;
let inflight: Promise<StartupRecord[]> | null = null;

export async function loadStartups(): Promise<StartupRecord[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const all: StartupRecord[] = [];
    let from = 0;
    const page = 500;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from("startups")
        .select("name,industry,status,funding_raised,funding_raised_usd,year_founded,year_closed,reason,description,tags")
        .range(from, from + page - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) {
        all.push({
          name: row.name,
          industry: row.industry,
          status: row.status as StartupStatus,
          fundingRaised: row.funding_raised,
          fundingRaisedUsd: Number(row.funding_raised_usd ?? 0),
          yearFounded: row.year_founded,
          yearClosed: row.year_closed ?? null,
          reason: row.reason,
          description: row.description,
          tags: row.tags ?? [],
        });
      }
      if (data.length < page) break;
      from += page;
    }
    cache = all;
    return all;
  })();
  return inflight;
}

const STOPWORDS = new Set([
  "a","an","the","and","or","of","for","to","in","on","with","that","this","is",
  "are","be","by","at","as","it","its","from","into","using","via","app","platform",
  "service","startup","idea","ai","ml","ai-powered","powered","based","new","online",
  "your","you","we","our","my","i","they","their",
]);

function tokenize(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}

export type ScoredStartup = {
  startup: StartupRecord;
  score: number;
  matchedTerms: string[];
};

const CATEGORY_RULES = [
  { category: "EdTech", industryMatch: ["edtech", "education"], terms: ["education", "edtech", "school", "student", "teacher", "tutor", "tutoring", "learning", "learn", "course", "class", "language", "kids", "k12", "bootcamp", "coding", "study"] },
  { category: "FinTech", industryMatch: ["fintech"], terms: ["fintech", "payment", "payments", "bank", "banking", "invoice", "checkout", "card", "finance", "money", "lending", "loan", "credit", "crypto", "wallet", "trading"] },
  { category: "AI", industryMatch: ["ai"], terms: ["ai", "artificial", "intelligence", "ml", "machine", "llm", "gpt", "model", "agent", "neural", "chatbot", "generative"] },
  { category: "HealthTech", industryMatch: ["healthtech", "health"], terms: ["health", "healthcare", "medical", "doctor", "patient", "diagnostic", "clinic", "wellness", "therapy", "mental", "telehealth", "pharma"] },
  { category: "SaaS", industryMatch: ["saas"], terms: ["saas", "productivity", "workflow", "workspace", "docs", "notes", "crm", "erp", "team", "b2b", "software", "collaboration", "dashboard"] },
  { category: "E-Commerce", industryMatch: ["e-commerce", "ecommerce"], terms: ["ecommerce", "e-commerce", "commerce", "shop", "store", "retail", "delivery", "grocery", "logistics", "inventory", "fulfillment", "dtc", "brand"] },
  { category: "Marketplace", industryMatch: ["marketplace"], terms: ["marketplace", "connect", "buyers", "sellers", "supply", "demand", "peer", "local", "booking", "two-sided", "freelance", "gig", "rental"] },
] as const;

export function identifyStartupCategory(idea: string): string {
  const normalized = idea.toLowerCase();
  const tokens = new Set(tokenize(idea));
  let best = { category: "EdTech", score: 0 };

  for (const rule of CATEGORY_RULES) {
    const score = rule.terms.reduce((total, term) => {
      const termScore = normalized.includes(term) || tokens.has(term) ? 1 : 0;
      return total + termScore;
    }, 0);
    if (score > best.score) {
      best = { category: rule.category, score };
    }
  }

  return best.category;
}

function categoryRuleFor(category: string) {
  return CATEGORY_RULES.find((r) => r.category === category);
}

function matchesIndustry(industry: string, category: string): boolean {
  const rule = categoryRuleFor(category);
  if (!rule) return false;
  const lower = industry.toLowerCase();
  return rule.industryMatch.some((m) => lower.includes(m));
}

/**
 * Score a startup against the user's idea. Higher = more relevant.
 * Weighted token matching across name, tags, description, reason, industry.
 */
export function scoreStartup(startup: StartupRecord, ideaTokens: string[]): ScoredStartup {
  const nameLower = startup.name.toLowerCase();
  const descLower = startup.description.toLowerCase();
  const reasonLower = startup.reason.toLowerCase();
  const industryLower = startup.industry.toLowerCase();
  const tagsLower = startup.tags.map((t) => t.toLowerCase());
  const matched: string[] = [];
  let score = 0;

  for (const token of ideaTokens) {
    if (!token) continue;
    let hit = 0;
    if (nameLower.includes(token)) hit += 6;
    if (tagsLower.some((t) => t === token)) hit += 5;
    else if (tagsLower.some((t) => t.includes(token))) hit += 3;
    if (descLower.includes(token)) hit += 3;
    if (reasonLower.includes(token)) hit += 2;
    if (industryLower.includes(token)) hit += 1;
    if (hit > 0) {
      score += hit;
      matched.push(token);
    }
  }
  return { startup, score, matchedTerms: Array.from(new Set(matched)) };
}

export type SearchOptions = {
  limit?: number;
  status?: StartupStatus;
  minScore?: number;
};

export async function searchStartups(idea: string, options: SearchOptions = {}): Promise<ScoredStartup[]> {
  const { limit, status, minScore = 1 } = options;
  const tokens = tokenize(idea);
  const startups = await loadStartups();
  const pool = status ? startups.filter((s) => s.status === status) : startups;
  const scored = pool
    .map((s) => scoreStartup(s, tokens))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.startup.name.localeCompare(b.startup.name));
  return typeof limit === "number" ? scored.slice(0, limit) : scored;
}

/**
 * Retrieve a balanced set of relevant survivors and failures for an idea.
 * 1. Score every startup with weighted keyword match against the idea.
 * 2. Prefer same-category matches; fill with cross-category high-relevance.
 * 3. Filler (when too few matches) uses same-category records ranked by
 *    secondary keyword overlap so different ideas still produce different sets.
 */
export async function retrieveRelevantStartups(
  idea: string,
  perBucket: number = 4,
): Promise<{ category: string; successes: ScoredStartup[]; failures: ScoredStartup[] }> {
  const category = identifyStartupCategory(idea);
  const startups = await loadStartups();
  const tokens = tokenize(idea);
  const ideaHash = Array.from(idea.toLowerCase()).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

  const allScored = startups.map((s) => {
    const scored = scoreStartup(s, tokens);
    // Boost startups whose industry matches the detected category — keeps
    // ranking within-category dominant but still allows strong cross-category
    // matches (e.g. "AI tutor" pulling AI rows into an EdTech query).
    const categoryBoost = matchesIndustry(s.industry, category) ? 4 : 0;
    return { ...scored, score: scored.score + categoryBoost };
  });

  const pick = (status: StartupStatus): ScoredStartup[] => {
    const ranked = allScored
      .filter((s) => s.startup.status === status)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Idea-stable pseudo-random tiebreak so different ideas in the same
        // category surface different filler rows instead of always the same top.
        const ha = (ideaHash ^ a.startup.name.charCodeAt(0)) & 0xff;
        const hb = (ideaHash ^ b.startup.name.charCodeAt(0)) & 0xff;
        return ha - hb;
      })
      .slice(0, perBucket);
    return ranked;
  };

  const result = { category, successes: pick("Success"), failures: pick("Failure") };

  if (typeof window !== "undefined") {
    // Debug: surface matched keywords + scores per idea so you can verify
    // different inputs produce different rankings.
    // eslint-disable-next-line no-console
    console.log("[retrieveRelevantStartups]", { idea, category, tokens,
      successes: result.successes.map((s) => ({ name: s.startup.name, score: s.score, matched: s.matchedTerms })),
      failures: result.failures.map((s) => ({ name: s.startup.name, score: s.score, matched: s.matchedTerms })),
    });
  }

  return result;
}

export async function getAllStartups(): Promise<StartupRecord[]> {
  return loadStartups();
}