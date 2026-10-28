# Releasing

Cove ships as a Manifest V3 extension for Chromium and Gecko, plus a source archive. Releases are built locally or in CI, verified, checksummed, and published as GitHub Release assets.

## Versioning

Cove uses semantic versioning for the extension:

- `MAJOR` for incompatible data or API changes,
- `MINOR` for new user-facing capabilities,
- `PATCH` for fixes and documentation.

`v0.1.3` is pre-1.0: minor versions may still include data migrations. Every migration must keep old backups importable for at least one minor release.

The backup schema has its own `version` field (currently 6). Do not confuse it with the extension version.

## Release checklist

### 1. Prepare

- [ ] Confirm `main` is green.
- [ ] Review open security advisories.
- [ ] Update `CHANGELOG.md` with user-visible changes.
- [ ] Update relevant docs and screenshots.
- [ ] Check that the README claims still match the build.
- [ ] Bump `version` in `package.json`.
- [ ] Run `npm run sync:version` to update all three manifests.
- [ ] Run `npm install` if dependencies changed, and commit the lockfile.

### 2. Verify

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:core
npm run budget
npm run verify
```

`npm run build` runs Vite and then `scripts/package-extensions.mjs`, which:

- syncs the root manifest from `public/manifest.json`,
- copies `dist/` to `unpacked-chrome-mv3/`,
- creates the canonical and versioned Chrome ZIP,
- stages a Firefox build with `manifest.firefox.json` and creates its ZIP,
- creates a clean source ZIP excluding `node_modules`, `dist`, `.git`, `unpacked-chrome-mv3`, `releases`, and local caches,
- writes `SHA256SUMS.txt` and `release-manifest.json`,
- copies the archives into `public/downloads/` and `dist/downloads/` for the web preview.

`npm run verify` checks the manifest, CSP, icons, wallpapers, archives, checksums, and release manifest.

### 3. Manual QA

Run the checklist in [Testing](testing.md#manual-qa) in a clean Chromium profile and a Firefox 140+ profile. Pay special attention to:

- install from the packaged ZIP, not only the dev server,
- the new tab override,
- Discover feed and reader,
- read later from the context menu,
- focus blocker redirect and pause,
- audio start/stop,
- backup export/import,
- offline rendering after a cache warm-up.

### 4. Tag and publish

```bash
git add -A
git commit -m "release: v0.1.2"
git tag -a v0.1.2 -m "Cove v0.1.2"
git push origin main
git push origin v0.1.2
```

The CI workflow runs verification on the tag and publishes the Chrome ZIP, Firefox ZIP, checksums, and release manifest to GitHub Releases. The source ZIP can be attached manually if the workflow does not include it.

### 5. Announce

- Update the website download links and version label.
- Update the README badge and quick facts.
- Post the release notes with a short "what changed" and a "what is still limited" section.
- Do not claim store availability until the listing is live.
- Do not claim benchmark numbers that were not measured on the release build.

## Packaging details

### Deterministic archives

`scripts/package-extensions.mjs` uses:

- `tar -a` on Windows (bsdtar),
- `zip -rq` on Unix.

Both include dotfiles and avoid a dependency on a platform-specific zip library. Archive bytes can still differ across zip implementations; checksums are generated from the actual file, not assumed.

### What ships

Chrome ZIP:

- `manifest.json` (Chromium MV3),
- `index.html`, `blocked.html`,
- `background.js`,
- hashed JS and CSS,
- icons,
- fonts,
- eight wallpapers.

Firefox ZIP:

- the same payload with `manifest.firefox.json` renamed to `manifest.json`,
- a Gecko ID and `strict_min_version: 128.0`.

Source ZIP:

- repository files needed to build,
- no `node_modules`, `dist`, `.git`, release archives, or unpacked output.

### What does not ship

- source maps,
- test files? They are in the source ZIP but not the extension ZIP,
- node_modules,
- release archives inside the extension,
- analytics or remote scripts.

## Checksums

`releases/SHA256SUMS.txt` lists the versioned archives. Verify with:

```bash
# macOS / Linux
shasum -a 256 -c SHA256SUMS.txt

# Windows PowerShell
Get-FileHash .\cove-chrome-mv3-v0.1.3.zip -Algorithm SHA256
```

Compare the digest to `releases/release-manifest.json`.

## Store submission

Store submission is not complete in `v0.1.3`. Before submitting:

- produce a privacy policy URL,
- justify every permission, especially `<all_urls>`,
- provide screenshots that match the shipped UI,
- test the store build in a clean profile,
- confirm the package does not include development routes,
- decide whether the Vite `/api/*` middleware is excluded (it is dev-only and not in `dist`),
- prepare a support URL and a security contact.

Do not describe Cove as "available on the Chrome Web Store" until the listing is approved and live.

## Rollback

If a release is broken:

1. Unpublish or mark the GitHub Release as pre-release.
2. Publish a patch release with the fix.
3. Update the README and website to point to the last known good version.
4. Post a short incident note with impact and data implications.
5. Add a regression test if the cause was testable.

There is no auto-update channel for manual installs. Users must download the new archive; say so plainly.

## Related reading

- [Testing](testing.md)
- [Security](security.md)
- [Publish to GitHub](publish-to-github.md)
- [Launch kit](launch-kit.md)
