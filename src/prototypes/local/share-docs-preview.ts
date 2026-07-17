import type { ExplainSelection } from "./DiwmJourney";

/** Hub cards / registry routes for share-docs design review (expert-help onward). */
export const SHARE_DOCS_PREVIEW_CHECKPOINTS = [
  { slug: "expert-help", stage: 19, title: "Expert help choice" },
  { slug: "expert-match-cards-1", stage: 21, title: "Match questionnaire · 1 of 2" },
  { slug: "expert-match-cards-2", stage: 22, title: "Match questionnaire · 2 of 2" },
  { slug: "expert-match-summary", stage: 23, title: "Match summary bubbles" },
  { slug: "expert-match-animation", stage: 24, title: "Expert match animation" },
  { slug: "ben-matched", stage: 25, title: "Ben matched + price intro" },
  { slug: "ben-welcome", stage: 29, title: "Ben welcome in chat" },
] as const;

export type ShareDocsPreviewSlug = (typeof SHARE_DOCS_PREVIEW_CHECKPOINTS)[number]["slug"];

/** Default explain selection for match-card copy in preview routes. */
export const SHARE_DOCS_PREVIEW_EXPLAIN_SELECTION: ExplainSelection = {
  pills: ["Job (W-2)", "Sold stock", "Sold crypto"],
  location: "Seattle",
};

const UPLOADED_DOC_COUNT = 3;
const UPLOAD_FETCH_STEP_COUNT = 3;
const IMPORT_STEP_COUNT = 3;

/** Canonical Gmail-import file names (mirror GOOGLE_IMPORT_DOCS in DiwmJourney). */
export const GMAIL_IMPORTED_FILE_NAMES = [
  "W-2_2024_NVIDIA.pdf",
  "Charity_donation_AHA.pdf",
];

export type ShareDocsPreviewInitialState = {
  visibleDocs: number;
  uploadFetchStep: number;
  uploadChosen: boolean;
  connectFilled: boolean;
  importStep: number;
  shareDocsActionReplies: { id: string; label: string }[];
  keepGoingChosen: boolean;
  welcomeCallChosen: boolean;
  googleConnectChosen: boolean;
  gmailBenPara: number;
  gmailImportedFiles: string[];
  deductionsChoice: null | "review" | "skip";
  benWrapUpDone: boolean;
};

export function getShareDocsInitialState(stage: number): ShareDocsPreviewInitialState {
  const state: ShareDocsPreviewInitialState = {
    visibleDocs: 0,
    uploadFetchStep: 0,
    uploadChosen: false,
    connectFilled: false,
    importStep: 0,
    shareDocsActionReplies: [],
    keepGoingChosen: false,
    welcomeCallChosen: false,
    googleConnectChosen: false,
    gmailBenPara: 0,
    gmailImportedFiles: [],
    deductionsChoice: null,
    benWrapUpDone: false,
  };

  if (stage >= 5) {
    state.uploadChosen = true;
    state.visibleDocs = UPLOADED_DOC_COUNT;
    state.uploadFetchStep = UPLOAD_FETCH_STEP_COUNT;
    state.shareDocsActionReplies = [{ id: "upload", label: "Upload" }];
  }

  if (stage >= 13) {
    state.connectFilled = true;
  }

  if (stage >= 14) {
    state.importStep = IMPORT_STEP_COUNT;
  }

  // Post-match "keep going" thread (Chloe chose to continue with Ben's help).
  if (stage >= 33) {
    state.keepGoingChosen = true;
  }

  // Gmail connect + import resolved (NVIDIA W-2 + charity receipt pulled in).
  if (stage >= 42) {
    state.googleConnectChosen = true;
    state.gmailImportedFiles = [...GMAIL_IMPORTED_FILE_NAMES];
  }

  // Ben's two-paragraph import-success message has fully streamed.
  if (stage >= 44) {
    state.gmailBenPara = 2;
  }

  // Deductions resolved (default to the Skip path) → Ben's wrap-up plays at stage 46.
  if (stage >= 45) {
    state.deductionsChoice = "skip";
  }

  // Synthetic post-wrap-up stages (≥47): wrap-up already done → PostCallFlow takes over.
  if (stage >= 47) {
    state.benWrapUpDone = true;
  }

  return state;
}
