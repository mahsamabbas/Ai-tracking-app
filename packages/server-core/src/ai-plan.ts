import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { PROVIDER_CAPABILITIES } from "@techlio/event-schema";

function orgTimezone(): string {
  return process.env.ORG_TIMEZONE ?? "UTC";
}

function pgErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}

function calendarMonthBoundsJs(): { from: Date; to: Date; label: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const label = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  return { from, to, label };
}

const TRACKED_PROVIDERS = ["cursor", "claude_code"] as const;

export type AiPlanLimits = Partial<
  Record<(typeof TRACKED_PROVIDERS)[number], { monthlyTokenBudget: number }>
>;

export interface EmployeeAiSubscriptionRow {
  provider: string;
  label: string;
  periodLabel: string;
  tokenInput: number | null;
  tokenOutput: number | null;
  tokensUsed: number | null;
  monthlyLimit: number | null;
  remaining: number | null;
  tokensFromTelemetry: boolean;
  limitConfigured: boolean;
}

function defaultLimits(): AiPlanLimits {
  const raw = process.env.TECHLIO_DEFAULT_AI_PLAN_LIMITS;
  if (raw) {
    try {
      return JSON.parse(raw) as AiPlanLimits;
    } catch {
      /* ignore */
    }
  }
  return {
    cursor: { monthlyTokenBudget: 5_000_000 },
    claude_code: { monthlyTokenBudget: 2_000_000 },
  };
}

export async function getOrgAiPlanLimits(organizationId: string): Promise<AiPlanLimits> {
  try {
    const res = await db.execute<{ ai_plan_limits: AiPlanLimits | null }>(sql`
      SELECT ai_plan_limits FROM organizations WHERE id = ${organizationId}
    `);
    const fromDb = res.rows[0]?.ai_plan_limits;
    if (fromDb && typeof fromDb === "object") {
      return { ...defaultLimits(), ...fromDb };
    }
    return defaultLimits();
  } catch (err) {
    // Migration 007 not applied yet — use defaults so employee pages still load.
    if (pgErrorCode(err) === "42703") return defaultLimits();
    throw err;
  }
}

/** Calendar month in org timezone (label + UTC bounds for session queries). */
export async function currentCalendarMonthBounds(): Promise<{
  from: Date;
  to: Date;
  label: string;
}> {
  try {
    const tz = orgTimezone();
    const res = await db.execute<{ month_start: Date; month_end: Date; label: string }>(sql`
      SELECT
        (date_trunc('month', timezone(${tz}, now()))) AT TIME ZONE ${tz} AS month_start,
        (date_trunc('month', timezone(${tz}, now())) + interval '1 month') AT TIME ZONE ${tz} AS month_end,
        to_char(timezone(${tz}, now()), 'FMMonth YYYY') AS label
    `);
    const row = res.rows[0];
    return {
      from: new Date(row?.month_start ?? new Date()),
      to: new Date(row?.month_end ?? new Date()),
      label: row?.label?.trim() ?? "This month",
    };
  } catch {
    return calendarMonthBoundsJs();
  }
}

function fallbackEmployeeAiSubscriptions(): EmployeeAiSubscriptionRow[] {
  const limits = defaultLimits();
  const { label } = calendarMonthBoundsJs();
  return TRACKED_PROVIDERS.map((provider) => {
    const cap = PROVIDER_CAPABILITIES[provider];
    const limit = limits[provider]?.monthlyTokenBudget ?? null;
    return {
      provider,
      label: cap?.label ?? provider,
      periodLabel: label,
      tokenInput: null,
      tokenOutput: null,
      tokensUsed: null,
      monthlyLimit: limit,
      remaining: limit,
      tokensFromTelemetry: false,
      limitConfigured: limit != null && limit > 0,
    };
  });
}

export async function employeeAiSubscriptions(
  organizationId: string,
  developerId: string,
): Promise<EmployeeAiSubscriptionRow[]> {
  try {
    return await employeeAiSubscriptionsInner(organizationId, developerId);
  } catch (err) {
    console.error("[employeeAiSubscriptions]", err);
    return fallbackEmployeeAiSubscriptions();
  }
}

async function employeeAiSubscriptionsInner(
  organizationId: string,
  developerId: string,
): Promise<EmployeeAiSubscriptionRow[]> {
  const [limits, monthBounds] = await Promise.all([
    getOrgAiPlanLimits(organizationId),
    currentCalendarMonthBounds(),
  ]);

  const usageRes = await db.execute<{
    provider: string;
    token_input: string | null;
    token_output: string | null;
    sessions_with_tokens: number;
  }>(sql`
    SELECT s.provider,
           SUM(s.token_input)  AS token_input,
           SUM(s.token_output) AS token_output,
           COUNT(*) FILTER (WHERE s.token_input IS NOT NULL OR s.token_output IS NOT NULL)::int
             AS sessions_with_tokens
    FROM agent_sessions s
    WHERE s.organization_id = ${organizationId}
      AND s.developer_id = ${developerId}
      AND s.provider IN (${sql.join(
        TRACKED_PROVIDERS.map((p) => sql`${p}`),
        sql`, `,
      )})
      AND s.started_at >= ${monthBounds.from}
      AND s.started_at < ${monthBounds.to}
    GROUP BY s.provider
  `);

  const usageByProvider = new Map(usageRes.rows.map((r) => [r.provider, r]));

  return TRACKED_PROVIDERS.map((provider) => {
    const cap = PROVIDER_CAPABILITIES[provider];
    const label = cap?.label ?? provider;
    const missingTokens = cap?.missing.includes("token_totals") ?? false;
    const row = usageByProvider.get(provider);
    const limit = limits[provider]?.monthlyTokenBudget ?? null;
    const limitConfigured = limit != null && limit > 0;

    let tokenInput: number | null = null;
    let tokenOutput: number | null = null;
    let tokensUsed: number | null = null;
    const tokensFromTelemetry = !missingTokens && (row?.sessions_with_tokens ?? 0) > 0;

    if (row && (row.sessions_with_tokens ?? 0) > 0) {
      tokenInput = Number(row.token_input ?? 0);
      tokenOutput = Number(row.token_output ?? 0);
      tokensUsed = tokenInput + tokenOutput;
    } else if (!missingTokens && row) {
      tokenInput = 0;
      tokenOutput = 0;
      tokensUsed = 0;
    }

    let remaining: number | null = null;
    if (limitConfigured && tokensUsed != null) {
      remaining = Math.max(0, limit! - tokensUsed);
    } else if (limitConfigured && tokensUsed == null) {
      remaining = null;
    }

    return {
      provider,
      label,
      periodLabel: monthBounds.label,
      tokenInput,
      tokenOutput,
      tokensUsed,
      monthlyLimit: limitConfigured ? limit : null,
      remaining,
      tokensFromTelemetry,
      limitConfigured,
    };
  });
}
