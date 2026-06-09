import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const StartupBriefSchema = z.object({
  name: z.string(),
  industry: z.string(),
  status: z.enum(["Success", "Failure"]),
  description: z.string(),
  reason: z.string(),
  tags: z.array(z.string()).default([]),
  fundingRaised: z.string().optional(),
});

const InputSchema = z.object({
  idea: z.string().min(1).max(2000),
  category: z.string().min(1).max(100),
  successes: z.array(StartupBriefSchema).max(10),
  failures: z.array(StartupBriefSchema).max(10),
});

export type GeminiAnalysis = {
  survivalProbability: number;
  marketRisk: number;
  executionRisk: number;
  fundingRisk: number;
  competitionRisk: number;
  causeOfDeathAnalysis: string;
  lessonsFromSurvivors: string;
  competitiveThreats: string;
  businessModelRisks: string;
  recommendedImprovements: string;
  finalVerdict: string;
};

const SYSTEM_PROMPT = `You are a forensic startup analyst. Analyze the user's startup idea using ONLY the provided successful and failed startup records as evidence. Ground every claim in those records — reference companies by name. Be specific, blunt, and useful. Respond with a single JSON object matching the requested schema. No prose outside JSON.`;

function buildUserPrompt(input: z.infer<typeof InputSchema>): string {
  const fmt = (s: z.infer<typeof StartupBriefSchema>) =>
    `- ${s.name} (${s.industry}) [${s.status}] funding=${s.fundingRaised ?? "n/a"}\n  desc: ${s.description}\n  ${s.status === "Failure" ? "failure_reason" : "success_reason"}: ${s.reason}\n  tags: ${s.tags.join(", ")}`;
  return [
    `USER STARTUP IDEA: "${input.idea}"`,
    `DETECTED CATEGORY: ${input.category}`,
    ``,
    `SUCCESSFUL COMPARABLES:`,
    input.successes.map(fmt).join("\n") || "(none)",
    ``,
    `FAILED COMPARABLES:`,
    input.failures.map(fmt).join("\n") || "(none)",
    ``,
    `Produce JSON with EXACTLY these keys:`,
    `{`,
    `  "survivalProbability": number 0-100,`,
    `  "marketRisk": number 0-100 (market saturation, demand uncertainty, timing),`,
    `  "executionRisk": number 0-100 (team, operational complexity, technical difficulty),`,
    `  "fundingRisk": number 0-100 (capital intensity, runway pressure, investor appetite),`,
    `  "competitionRisk": number 0-100 (incumbent threat, low moats, commoditization),`,
    `  "causeOfDeathAnalysis": string (2-4 sentences, cite failed companies by name),`,
    `  "lessonsFromSurvivors": string (2-4 sentences, cite successful companies by name),`,
    `  "competitiveThreats": string (2-4 sentences),`,
    `  "businessModelRisks": string (2-4 sentences),`,
    `  "recommendedImprovements": string (3-5 concrete actions, can use markdown bullets),`,
    `  "finalVerdict": string (1-2 punchy sentences)`,
    `}`,
  ].join("\n");
}

export const analyzeWithGemini = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<GeminiAnalysis> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Gemini rate limit exceeded. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Gemini returned non-JSON response");
      parsed = JSON.parse(match[0]);
    }

    const p = parsed as Partial<GeminiAnalysis>;
    const clamp = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
    };
    return {
      survivalProbability: clamp(p.survivalProbability, 50),
      marketRisk: clamp(p.marketRisk, 50),
      executionRisk: clamp(p.executionRisk, 50),
      fundingRisk: clamp(p.fundingRisk, 50),
      competitionRisk: clamp(p.competitionRisk, 50),
      causeOfDeathAnalysis: String(p.causeOfDeathAnalysis ?? ""),
      lessonsFromSurvivors: String(p.lessonsFromSurvivors ?? ""),
      competitiveThreats: String(p.competitiveThreats ?? ""),
      businessModelRisks: String(p.businessModelRisks ?? ""),
      recommendedImprovements: String(p.recommendedImprovements ?? ""),
      finalVerdict: String(p.finalVerdict ?? ""),
    };
  });