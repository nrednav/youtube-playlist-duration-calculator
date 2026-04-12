# AGENTS.md

## Environment

- Node.js >=20 (see `.nvmrc`). Engine enforcement is strict (`.npmrc`).
- Package manager: npm. Lock file: `package-lock.json`.
- Build tool: Vite 7 via `vite-plugin-web-extension`.
- Linter/formatter: Biome. Ignore `.eslintrc.cjs` and `prettier.config.cjs` (legacy dead weight).

## Commands

```bash
npm run dev              # Vite dev server (Chrome default)
npm run build:chrome     # Production build for Chrome (MV3)
npm run build:firefox    # Production build for Firefox (MV2)
npm run watch            # Rebuild on file changes (development mode)
npm run clean            # Delete dist/
npm test                 # Unit tests (node:test via tsx)
npm run lint             # Biome lint --write
npm run format           # Biome format --write
npm run check            # Biome lint + format --write
```

## Testing

- Framework: Node.js built-in `node:test` with `node:assert`.
- Runner: `tsx --test`.
- Test files are co-located: `foo.js` -> `foo.test.js` in the same directory.
- New logic must include a co-located `.test.js` file.
- Always run `npm test` before committing. Do not commit if tests fail.

## Project Structure

```
src/
  main.js                          # Content script entry point
  main.css                         # Injected styles
  manifest.json                    # Extension manifest (Chrome MV3 / Firefox MV2 templates)
  modules/sorting/                 # Sorting feature modules
    sort-by-channel-name/
    sort-by-duration/
    sort-by-index/
    sort-by-upload-date/parsers/   # Locale-specific date parsers
    sort-by-views/parsers/         # Locale-specific views parsers
  shared/
    data/element-selectors.js      # YouTube DOM selectors
    modules/logger.js              # Structured logger
    modules/timestamp.js           # Timestamp utilities
public/
  _locales/{en,es,pt,zh}/          # i18n message files
  icon{16,48,128}.png              # Extension icons
dist/                              # Build output (gitignored)
```

## Code Style

Biome is the single source of truth (`biome.json`). Key rules:

- Indent: 2 spaces.
- Quotes: double.
- Semicolons: yes.
- Naming: `camelCase` for variables/functions, `PascalCase` for classes, `kebab-case` for CSS classes (prefix: `ytpdc-`).
- Imports: organized by Biome (auto-sorted).
- No parameter reassignment, no useless else, no unused template literals.

Before committing, run `npm run check` to auto-fix lint and format issues.

## i18n

- Locales: `en`, `es`, `fr`, `pt`, `zh` in `public/_locales/`.
- When adding or modifying user-facing strings, update all four locale files.

## Git Workflow

### Branches

- `main` is the primary branch. All PRs target `main` and are based off `main`.
- Branch naming: `fix/<issue-number>`, `feat/<description>`, `refactor/<description>`.
- Never create `release/*` branches.

### Commit Messages

Follow the Seven Rules:

1. Separate subject from body with a blank line.
2. Subject line: 50 characters max.
3. Capitalize the subject line.
4. No trailing period on the subject line.
5. Imperative mood ("Fix bug", not "Fixed bug"). Test: "If applied, this commit will [SUBJECT]".
6. Wrap body at 72 characters.
7. Body explains **why**, not how. The diff shows how.

```
Fix whitespace handling in full_name generation

Previously, the string concatenation would merge first and last
names without a space. This updates the function to use string
interpolation, ensuring a space is correctly inserted between
names.
```

### Pull Requests

- Strategy: squash and merge.
- Target: `main` only.

### Pre-commit Hook

Husky runs `lint-staged` on commit, which executes `npm run check` on staged `*.{js,cjs,mjs,json}` files.

## Boundaries

### Always Do

- Always run `npm test` before committing.
- Always run `npm run check` before committing.
- Always update all four i18n locales when changing user-facing strings.
- Always co-locate test files next to the module they test.

### Ask First

- Ask first before installing or removing npm packages (`npm install`, `npm uninstall`).
- Ask first before modifying `package.json` dependencies or devDependencies.
- Ask first before changing build configuration (`vite.config.js`, `biome.json`, `tsconfig.json`).
- Ask first before creating new top-level directories or files.
- Ask first before any action affecting CI, hooks, or the release process.

### Never Do

- Never push directly to `main`.
- Never create `release/*` branches.
- Never modify `package-lock.json` manually.
- Never modify `LICENSE`.
- Never modify or replace files in `screenshots/`.
- Never modify or replace `public/icon*.png`.
- Never commit secrets, tokens, or credentials.
- Never run destructive git operations (`--force`, `reset --hard`) without explicit instruction.
