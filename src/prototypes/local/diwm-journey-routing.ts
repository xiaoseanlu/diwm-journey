/** Deep-link slugs for in-flow screens (hash segment after the flow route). */

export const DIWM_SCREEN_SLUGS = [
  "landing",
  "welcome-hub",
  "welcome-chloe",
  "hub",
  "connect",
  "explain",
  "share-docs",
  "tax-story",
] as const;

export type DiwmScreenSlug = (typeof DIWM_SCREEN_SLUGS)[number];

/**
 * Named deep-link checkpoints → share-docs chat stage. Lets you type
 * `…/share-docs?stage=wrap-up` instead of memorizing the numeric stage.
 */
export const DIWM_STAGE_CHECKPOINTS: Record<string, number> = {
  "expert-help": 19,
  "match-1": 21,
  "match-2": 22,
  "match-summary": 23,
  "ben-matched": 25,
  "ben-welcome": 29,
  "keep-going": 33,
  gmail: 40,
  "gmail-imported": 44,
  deductions: 44,
  "wrap-up": 46,
  // Post-wrap-up flow — synthetic stages (≥47) that map to PostCallFlow phases.
  transcribing: 47,
  recap: 48,
  "docs-prompt": 49,
  "running-checks": 50,
  "state-interim": 51,
  "refund-estimate": 52,
  "expert-review": 53,
  "appointment-booked": 54,
  "appointment-upcoming": 55,
  "expert-review-declined": 56,
};

/**
 * Synthetic stages (≥47) → PostCallFlow phase. DiwmJourney renders the wrap-up as done
 * and drops the user into the matching post-call phase. (PostCallPhase string literals.)
 */
export const DIWM_POST_CALL_STAGES: Record<
  number,
  {
    phase: string;
    expertReview?: boolean;
    schedulePhase?: "booked" | "declined";
    appointmentUpcoming?: boolean;
  }
> = {
  47: { phase: "transcribing" },
  48: { phase: "recap" },
  49: { phase: "docs-prompt" },
  50: { phase: "processing" },
  51: { phase: "state-interim" },
  52: { phase: "refund-estimate" },
  53: { phase: "refund-estimate", expertReview: true },
  // Expert-review scheduling outcomes (after picking a time / declining).
  54: { phase: "refund-estimate", expertReview: true, schedulePhase: "booked" },
  55: { phase: "refund-estimate", expertReview: true, appointmentUpcoming: true },
  56: { phase: "refund-estimate", expertReview: true, schedulePhase: "declined" },
};

/**
 * Ordered targets for the dev "Jump to…" dropdown. `value` is parsed by DiwmJourney:
 *   `screen:<slug>` · `screen:tax-story?taxes` · `stage:<n>`
 */
export const DIWM_JUMP_GROUPS: {
  group: string;
  items: { label: string; value: string }[];
}[] = [
  {
    group: "Screens",
    items: [
      { label: "Landing", value: "screen:landing" },
      { label: "Welcome hub", value: "screen:welcome-hub" },
      { label: "Welcome · Chloe", value: "screen:welcome-chloe" },
    ],
  },
  {
    group: "Chat stages",
    items: [
      { label: "Add docs (start)", value: "stage:0" },
      { label: "Docs uploaded", value: "stage:8" },
      { label: "E*Trade / Chase income", value: "stage:11" },
      { label: "Expert help choice", value: "stage:19" },
      { label: "Match questionnaire · 1", value: "stage:21" },
      { label: "Match questionnaire · 2", value: "stage:22" },
      { label: "Match summary", value: "stage:23" },
      { label: "Matched with Ben", value: "stage:25" },
      { label: "Ben welcome", value: "stage:29" },
      { label: "Keep going in chat", value: "stage:33" },
      { label: "Cost-basis thread", value: "stage:34" },
      { label: "Gmail permission", value: "stage:39" },
      { label: "Gmail connect", value: "stage:40" },
      { label: "Gmail imported / deductions", value: "stage:44" },
      { label: "Ben wrap-up", value: "stage:46" },
    ],
  },
  {
    group: "After wrap-up",
    items: [
      { label: "Transcribing", value: "stage:47" },
      { label: "Conversation recap", value: "stage:48" },
      { label: "More docs prompt", value: "stage:49" },
      { label: "Running checks", value: "stage:50" },
      { label: "State interim", value: "stage:51" },
      { label: "Refund estimate", value: "stage:52" },
      { label: "Refund + expert review (schedule pill)", value: "stage:53" },
      { label: "Expert review declined (alt branch)", value: "stage:56" },
    ],
  },
  {
    group: "Tax story & expert review",
    items: [
      { label: "Schedule a time (calendar)", value: "schedule:calendar" },
      { label: "Appointment confirmed", value: "schedule:confirmed" },
      { label: "Appointment booked (in chat)", value: "stage:54" },
      { label: "Upcoming appointment", value: "stage:55" },
      { label: "Appointment reminder (lock screen)", value: "push-notification" },
      { label: "Tax story · Taxes", value: "screen:tax-story?taxes" },
      { label: "Tax story · Tools", value: "screen:tax-story?tools" },
      { label: "Incoming expert call", value: "taxstory:incoming-call" },
      { label: "Live review with Ben", value: "taxstory:live-review" },
      { label: "HSA review (Form 8889)", value: "taxstory:hsa-review" },
      { label: "Return reviewed by Ben", value: "taxstory:return-reviewed" },
      { label: "Plan ahead for next year", value: "taxstory:plan-ahead" },
      { label: "Mid-year check-in scheduled", value: "taxstory:mid-year-check-in" },
      { label: "Refer a friend", value: "taxstory:refer-friend" },
    ],
  },
];

/** Sorted numeric chat stages that appear as "Jump to…" options (for current-stage matching). */
export const DIWM_STAGE_JUMP_VALUES: number[] = DIWM_JUMP_GROUPS.flatMap((g) =>
  g.items
    .map((it) => it.value)
    .filter((v) => v.startsWith("stage:"))
    .map((v) => Number.parseInt(v.slice("stage:".length), 10)),
)
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

export function getAppHash(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

export function isDiwmScreenSlug(value: string): value is DiwmScreenSlug {
  return (DIWM_SCREEN_SLUGS as readonly string[]).includes(value);
}

/** Resolve a `stage` query value — either a numeric stage or a named checkpoint. */
export function resolveStageParam(value: string | null): number | null {
  if (!value) return null;
  if (Object.prototype.hasOwnProperty.call(DIWM_STAGE_CHECKPOINTS, value)) {
    return DIWM_STAGE_CHECKPOINTS[value];
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Parse `flow-route/screen?tab=tools&stage=46` from the current app hash. */
export function parseDiwmRoute(
  hash: string,
  routeBase: string,
): { screen: DiwmScreenSlug | null; tab: "taxes" | "tools" | null; stage: number | null } {
  const normalized = hash.replace(/^#\/?/, "");
  if (normalized === routeBase) {
    return { screen: null, tab: null, stage: null };
  }

  const prefix = `${routeBase}/`;
  if (!normalized.startsWith(prefix)) {
    return { screen: null, tab: null, stage: null };
  }

  const rest = normalized.slice(prefix.length);
  const [segment, query = ""] = rest.split("?");
  if (!isDiwmScreenSlug(segment)) {
    return { screen: null, tab: null, stage: null };
  }

  const params = new URLSearchParams(query);
  const tabParam = params.get("tab");
  const tab = tabParam === "taxes" || tabParam === "tools" ? tabParam : null;
  const stage = resolveStageParam(params.get("stage"));

  return { screen: segment, tab, stage };
}

export function buildDiwmHash(
  routeBase: string,
  screen: DiwmScreenSlug,
  options?: { tab?: "taxes" | "tools"; stage?: number },
): string {
  const params = new URLSearchParams();
  if (screen === "tax-story" && options?.tab) params.set("tab", options.tab);
  if (screen === "share-docs" && options?.stage != null) {
    params.set("stage", String(options.stage));
  }
  const query = params.toString();
  return `#/${routeBase}/${screen}${query ? `?${query}` : ""}`;
}
