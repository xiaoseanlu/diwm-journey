import type { ComponentProps, ReactNode } from "react";
import type { PrototypeEntry } from "./registry";
import { DiwmPhoneShell } from "../DiwmPhoneShell";
import { MWebShell } from "../MWebShell";
import { CdsComponentDemo } from "./local/CdsComponentDemo";
import { DiwmJourney, type TaxStoryTaxesVariant } from "./local/DiwmJourney";
import type { PostCallCoverageOutcome, PostCallPhase } from "./local/PostCallFlow";
import { SHARE_DOCS_PREVIEW_CHECKPOINTS } from "./local/share-docs-preview";

/** DIWM Customer Journey only — phone frame + per-screen URLs. */
function renderDiwmCustomerJourney(): ReactNode {
  return renderDiwmCustomerJourneyWithProps({ syncScreenUrl: true });
}

function renderDiwmCustomerJourneyWithProps(
  journeyProps?: ComponentProps<typeof DiwmJourney>,
): ReactNode {
  const {
    routeBase = "diwm-journey/mweb",
    syncScreenUrl = false,
    ...rest
  } = journeyProps ?? {};
  return (
    <DiwmPhoneShell>
      <DiwmJourney routeBase={routeBase} syncScreenUrl={syncScreenUrl} {...rest} />
    </DiwmPhoneShell>
  );
}

/** Other DIWM vignettes (post-call, tax previews) — standard mWeb shell, no phone frame. */
function renderDiwmInMWebShell(
  progressPct: number,
  journeyProps?: ComponentProps<typeof DiwmJourney>,
): ReactNode {
  return (
    <MWebShell progressPct={progressPct} immersive>
      <DiwmJourney {...journeyProps} />
    </MWebShell>
  );
}

const TAX_STORY_VARIANTS: {
  slug: string;
  title: string;
  variant: TaxStoryTaxesVariant;
  previewReturnReviewed?: boolean;
}[] = [
  { slug: "taxes-complete", title: "Taxes · Complete + state refund", variant: "complete-with-state-refund" },
  { slug: "taxes-deductions-expanded", title: "Taxes · Deductions expanded", variant: "deductions-expanded" },
  { slug: "taxes-empty", title: "Taxes · Empty start", variant: "empty-start" },
  { slug: "taxes-in-progress-expert", title: "Taxes · In progress + expert", variant: "in-progress-with-expert" },
  { slug: "taxes-expert-final-review", title: "Taxes · Expert final review", variant: "expert-final-review" },
  { slug: "taxes-return-reviewed", title: "Taxes · Return reviewed by Ben", variant: "expert-final-review", previewReturnReviewed: true },
  { slug: "taxes-mid-progress", title: "Taxes · Mid progress", variant: "mid-progress" },
];

export const localPrototypes: PrototypeEntry[] = [
  {
    slug: "cds-component-demo",
    title: "CDS component demo",
    description: "Smoke test for cds-react-components (Button, Header, Badge, icons).",
    section: "CDS",
    platforms: {
      mweb: {
        route: "cds-component-demo/mweb",
        render: () => (
          <MWebShell progressPct={0}>
            <CdsComponentDemo />
          </MWebShell>
        ),
      },
    },
  },
  {
    slug: "diwm-journey",
    title: "DIWM Customer Journey",
    description:
      "FY27 vignette — multi-screen clickable flow: landing, doc upload + chat, expert match.",
    section: "1 Year · DIWM Customer",
    platforms: {
      mweb: {
        route: "diwm-journey/mweb",
        render: () => renderDiwmCustomerJourney(),
      },
    },
  },
  {
    slug: "diwm-welcome-hub",
    title: "DIWM · Welcome hub (preview)",
    description: "Welcome! screen with piggy hero — design preview.",
    section: "1 Year · DIWM Customer",
    platforms: {
      mweb: {
        route: "diwm-welcome-hub/mweb",
        render: () => renderDiwmInMWebShell(10, { initialScreen: "welcome-hub" }),
      },
    },
  },
  ...(
    [
      { slug: "post-call-covered", title: "Post-call · All covered", coverage: "all-covered" as PostCallCoverageOutcome, skipToChecks: false },
      { slug: "post-call-gap", title: "Post-call · Gap found", coverage: "gap-found" as PostCallCoverageOutcome, skipToChecks: false },
      { slug: "post-call-running-checks", title: "Post-call · Running checks anim", coverage: "all-covered" as PostCallCoverageOutcome, skipToChecks: true },
      { slug: "post-call-state-interim", title: "Post-call · State interim", coverage: "all-covered" as PostCallCoverageOutcome, previewPhase: "state-interim" as PostCallPhase },
      { slug: "post-call-refund-estimate", title: "Post-call · Refund estimate", coverage: "all-covered" as PostCallCoverageOutcome, previewPhase: "refund-estimate" as PostCallPhase },
      { slug: "post-call-expert-review", title: "Post-call · Expert review", coverage: "all-covered" as PostCallCoverageOutcome, previewPhase: "refund-estimate" as PostCallPhase, previewExpertReview: true },
      { slug: "post-call-appointment-upcoming", title: "Post-call · Appointment upcoming", coverage: "all-covered" as PostCallCoverageOutcome, previewAppointmentUpcoming: true },
    ] as const
  ).map((entry) => {
    const { slug, title, coverage } = entry;
    const skipToChecks = "skipToChecks" in entry ? entry.skipToChecks : false;
    const previewPhase = "previewPhase" in entry ? entry.previewPhase : undefined;
    const previewExpertReview =
      "previewExpertReview" in entry ? entry.previewExpertReview : false;
    const previewAppointmentUpcoming =
      "previewAppointmentUpcoming" in entry ? entry.previewAppointmentUpcoming : false;
    return {
      slug: `diwm-${slug}`,
      title,
      description: `After Ben ends call — doc coverage (${coverage})`,
      section: "1 Year · DIWM Customer",
      platforms: {
        mweb: {
          route: `diwm-${slug}/mweb`,
          render: () =>
            renderDiwmInMWebShell(35, {
              initialScreen: "share-docs",
              postCallPreview: true,
              postCallSkipToChecks: skipToChecks,
              postCallPreviewPhase: previewPhase,
              postCallPreviewExpertReview: previewExpertReview,
              previewAppointmentUpcoming,
              postCallCoverage: coverage,
            }),
        },
      },
    };
  }),
  ...SHARE_DOCS_PREVIEW_CHECKPOINTS.map(({ slug, stage, title }) => ({
    slug: `diwm-share-docs-${slug}`,
    title,
    description: `Share-docs preview — starts at stage ${stage} (expert-help onward).`,
    section: "1 Year · DIWM Customer · Share docs previews",
    platforms: {
      mweb: {
        route: `diwm-share-docs-${slug}/mweb`,
        render: () =>
          renderDiwmCustomerJourneyWithProps({
            shareDocsPreviewStage: stage,
            syncScreenUrl: false,
          }),
      },
    },
  })),
  ...TAX_STORY_VARIANTS.map(({ slug, title, variant, previewReturnReviewed }) => ({
    slug: `diwm-${slug}`,
    title,
    description: `Taxes tab preview — ${variant}${previewReturnReviewed ? " (return reviewed)" : ""}`,
    section: "1 Year · DIWM Customer",
    platforms: {
      mweb: {
        route: `diwm-${slug}/mweb`,
        render: () =>
          renderDiwmInMWebShell(100, {
            initialScreen: "tax-story",
            taxesVariant: variant,
            previewReturnReviewed: previewReturnReviewed ?? false,
          }),
      },
    },
  })),
];
