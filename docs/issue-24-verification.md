# Issue #24 — bounded local verification

Verified September 5, 2026 in `C:/Users/bandr/Documents/studycircle/studycircle`.

## Scope

Changed only `src/app/page.tsx`, `src/app/landing.css`, `src/app/layout.tsx`, and this note. Preserved the existing landing composition, original branding, signup/login links, and `getCurrentUser()` redirect to `/spaces`. No auth or onboarding behavior edits, dependencies, commits, pushes, GitHub writes, or deployments.

Replaced session-folder and syllabus promises with shared notes/voice memos, source-linked Circle AI, and copy/paste Quizlet export. Preview content is visibly labeled illustrative. Native details/summary FAQ covers campus eligibility, professor spaces, supported uploads and limits, AI sources, and Quizlet import.

Evidence for copy: `src/components/study/ClassWorkspace.tsx`, `src/lib/knowledge/shared.ts`, `files.ts`, and `extract.ts`. Upload FAQ names DOCX, 25 MB general limit, 500 KB text/Markdown limit, and 60-page PDF limit.

## Local checks passed

- Focused ESLint: `node node_modules/eslint/bin/eslint.js src/app/page.tsx src/app/layout.tsx`.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Scoped `git diff --check` passed; only line-ending advisory warnings.
- Local landing HTTP 200. Browser QA at 1440x1000 and 375x812: existing layout preserved, no horizontal overflow (document widths 1425 and 360 respectively), illustrative label visible, FAQ readable.
- Native FAQ opens with Enter and closes with Space. Tab advances to the next question with a visible solid focus outline. Accessibility tree exposes five named disclosure buttons and the illustrative label; decorative cards stay hidden from assistive technology.
- Clicked landing Log in and Sign up links: reached `/login` and `/signup` and their expected forms. No form submission or onboarding interaction. Signed-in redirect was preserved by source review; authenticated runtime verification was not performed.
- Browser computed-color contrast against the rendered solid backgrounds: muted large headline 3.70:1; campus note 4.87:1; footer 4.70:1; FAQ summary 12.76:1; FAQ answer 5.60:1; preview label 5.80:1. These meet the applicable 3:1 large-text or 4.5:1 normal-text thresholds. This is focused QA, not a full accessibility audit.
- Verified existing `public/brand/studycircle-original.png` dimensions using Sharp: 1650x1614, matching metadata and BrandMark. No new artwork needed.
- Inspected rendered OpenGraph and Twitter title, description, image, dimensions, and image alt tags. Twitter uses a summary card. `metadataBase` uses existing `APP_URL`, with localhost fallback; local configuration resolves the image to `http://127.0.0.1:3000/brand/studycircle-original.png`. No public domain or social handle invented.

Read root AGENTS.md and applicable bundled Next metadata/OG guide and metadata API documentation before editing. Browser viewport override reset after QA.

## Pending / handoff

Parent integration verification passed: all 137 offline tests (80 TypeScript and 57 Node tests), TypeScript checking, and the production build. Repository ESLint completed with zero errors and one pre-existing image warning in `MeetupCard.tsx`. The build compiled successfully and generated all 29 static pages; the landing route remains server-rendered. No deployment was performed.

Deployed-domain verification remains pending: configure/confirm the real HTTPS APP_URL; verify anonymous landing, signup/login navigation, authenticated redirect, publicly fetchable social image, rendered social URLs, and actual social crawler previews on the deployed domain. Local metadata rendering does not establish hosted availability or crawler success. No hosted verification or deployment was performed.
