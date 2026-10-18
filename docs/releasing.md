# How to Release a New Version

This guide shows you how to publish a new version of the extension to the Chrome
Web Store and Firefox Add-ons. You should already be familiar with the test suite
in [testing.md](./testing.md) and the git workflow in [AGENTS.md](../AGENTS.md).

## 1. Confirm main is ready to ship

- To ship only code that passes the gates, open the latest CI run on `main` and
  confirm it is green. CI runs the lint check, the test suite, and both builds.
- If the run is red, stop and fix it first.
- If the change you want to ship is still on a branch, merge it first. A release
  ships what is already on `main`.

## 2. Decide the version number

To pick the version, read the changes since the last tag:

```
git log --oneline v2.3.1..main
```

- If every change fixes incorrect behaviour and adds no setting, permission, or
  summary element, bump PATCH. `2.3.1` becomes `2.3.2`.
- If a change adds a user-facing capability and leaves the existing summary
  working, bump MINOR. `2.3.1` becomes `2.4.0`.
- If a change breaks stored state, permissions, or the summary structure, bump
  MAJOR. `2.3.1` becomes `3.0.0`.
- If several changes ship together, use the largest bump among them.

If you are not ready to ship yet, stop here. The changelog entries stay under
`[Unreleased]` until you cut the release.

## 3. Merge every queued change first

- To ship several changes in one release, merge each as its own PR before you
  start. The release commit adds no source code.
- Confirm every entry you intend to ship is already written under
  `## [Unreleased]` in `CHANGELOG.md`.

## 4. Create the release branch

- To keep the release reviewable on its own, create a short branch. AGENTS.md
  forbids `release/*`, so use the `chore/` prefix.

```
git switch main
git pull
git switch -c chore/release-v2.3.2
```

## 5. Bump the version

- To set the version everywhere, edit `version` in `package.json`. That is the
  only place the version lives. The build injects it into the Chrome and Firefox
  manifests.
- To keep the lockfile in sync, run:

```
npm install --package-lock-only
```

- Confirm the lockfile diff is limited to the version:

```
git diff package-lock.json
```

## 6. Close the changelog section

- To date the release, rename the top section header in `CHANGELOG.md` from
  `## [Unreleased]` to `## [v2.3.2] - YYYY-MM-DD`, using today's date.
- To leave room for the next release, add a new `## [Unreleased]` header above
  it.
- To keep the compare links correct, update the link block at the bottom of the
  file. Point `[Unreleased]` at `compare/v2.3.2...HEAD` and add `[v2.3.2]`
  pointing at `compare/v2.3.1...v2.3.2`.
- Confirm every version header in the file has a matching link line.

## 7. Open the release pull request

- To keep the release separate from source changes, open a PR titled
  `Release v2.3.2`.
- Confirm the diff contains only `package.json`, `package-lock.json`, and
  `CHANGELOG.md`. If a source file appears, move that change to its own PR and
  merge it first.
- Wait for CI on the pull request.

## 8. Merge and tag

- To record the release in history, squash-merge the pull request.
- To mark the shipped commit, tag the merge commit:

```
git switch main
git pull
git tag -a v2.3.2 -m "v2.3.2"
git push origin v2.3.2
```

- Confirm the tag points at the merge commit:

```
git tag --points-at HEAD
```

## 9. Build both artifacts from the tag

- To make the artifact match the tag, build from the tag, not from a branch:

```
git switch --detach v2.3.2
npm ci
```

- To build Chrome, run `npm run build:chrome`, then zip the contents of `dist`
  from inside that directory:

```
cd dist && zip -r ../ytpdc-2.3.2-chrome.zip . && cd ..
```

- To build Firefox, run `npm run build:firefox`, then zip the same way into
  `ytpdc-2.3.2-firefox.zip`.
- Confirm `manifest.json` sits at the root of each zip, not inside a
  subdirectory. Both stores reject a nested manifest.
- To record the artifacts, run `sha256sum ytpdc-2.3.2-*.zip` and keep the output
  with the release notes.

## 10. Upload to the stores

- To publish for Chrome, upload `ytpdc-2.3.2-chrome.zip` in the Chrome Web Store
  developer dashboard and submit it for review.
- To publish for Firefox, upload `ytpdc-2.3.2-firefox.zip` to
  addons.mozilla.org and submit it for review. AMO signs the package.
- If a store rejects the upload as a duplicate version, the version was not
  bumped. Return to step 5.

## 11. Publish the GitHub release

- To tie the notes to the tag, create a GitHub release from tag `v2.3.2` and
  paste the changelog section as its body.
- Confirm the store listing shows the new version. Store review takes hours to
  days, so the tag and the live listing are not simultaneous.

## If the release goes wrong

- If CI fails on the release pull request, fix the failure on the same branch,
  push, and let CI run again. The pull request stays open.
- If the tag is wrong and nothing has been built from it, delete it and retag the
  corrected commit:

```
git tag -d v2.3.2
git push origin --delete v2.3.2
```

- If a store has already accepted the version and you must ship a fix, bump
  PATCH again and repeat from step 4. A store does not accept a second upload
  with the same version, so a published version is spent.

You have released v2.3.2 to both stores.
