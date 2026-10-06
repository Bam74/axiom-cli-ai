# CLI AI Workbench

AI-assisted intelligence across the property development lifecycle. This is a synthetic demonstration for an Axiom AI at Work session. It is not actual Cebu Landmasters data.

## Run locally

```bash
npm install
npm run dev
```

The local app does not need a network connection after install. There is no login and no database.

## What the walkthrough shows

Information, then insight, then action, then management intelligence:

- Enterprise Overview
- Project Intelligence
- Sales & Buyer Intelligence
- Customer & Property Intelligence
- Management Intelligence

Use **Start Guided Demo** on the home screen for a clean recovery. The right-side Demo Guide tells the presenter what to click next. It does not move the application on its own.

## Data

Synthetic records live in `public/data`. They were exported from `data/source/CLI_AI_Workbench_Synthetic_Data.xlsx`. Regenerate them with:

```bash
npm run export-data
```

Factual figures are calculated from those files. Narrative outputs explain those figures and stay tied to the source records.

## Publish

The repository includes a GitHub Actions workflow that publishes the static build to GitHub Pages on every push to `main`. The site is served at the root of `https://axiom-cli-ai.axiomph.com`. DNS for that host should point at the GitHub Pages target for this repository.

```bash
gh repo create axiom-cli-ai --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/axiom-cli-ai/pages -f build_type=workflow
```

Check the acceptance figures before publishing:

```bash
npm run verify
```
