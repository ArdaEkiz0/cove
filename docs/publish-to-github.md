# Publish to GitHub

Target repository: `https://github.com/DevAnimecx/cove`

This runbook assumes the repository already exists on GitHub and is empty (or safe to receive the first push). It does not create the repository for you.

## Before you push

1. Confirm you are in the project root:

   ```bash
   cd C:\Users\india\Downloads\Cove\cove
   ```

2. Confirm the working tree is clean or that you intend to commit the remaining changes:

   ```bash
   git status
   ```

3. Confirm the branch is `main`:

   ```bash
   git branch --show-current
   ```

4. Confirm the release artifacts are current:

   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run build
   npm run test:core
   npm run budget
   npm run verify
   ```

5. Confirm no local-only or secret files are tracked:

   ```bash
   git ls-files | Select-String -Pattern "\.env|node_modules|\.zip$|\.pem|\.key"
   ```

   Release ZIPs under `releases/` and `public/downloads/` are intentional. Do not commit private keys or `.env` files.

## Add the remote and push

```bash
git remote add origin https://github.com/DevAnimecx/cove.git
git push -u origin main
```

If a remote named `origin` already exists and points somewhere else:

```bash
git remote set-url origin https://github.com/DevAnimecx/cove.git
git push -u origin main
```

If the remote already has a README or license and you want your history to win, only do this if you are certain:

```bash
git push -u origin main --force
```

`--force` overwrites remote history. Do not use it on a repository with collaborators or work you want to keep.

## Verify the push

```bash
git remote -v
git log --oneline -5
git status
```

On GitHub, confirm:

- the README renders,
- the screenshots load,
- the license is detected as Apache-2.0,
- Actions runs the CI workflow,
- the About description and topics are set,
- the release is published.

## Tag and publish a release

After the push is green:

```bash
git tag -a v0.1.1 -m "Cove v0.1.1"
git push origin v0.1.1
```

The tag starts the release job in `.github/workflows/ci-release.yml`. It publishes the verified Chrome ZIP, Firefox ZIP, checksums, and release manifest.

If the workflow does not attach the source ZIP, add `releases/cove-github-source-v0.1.1.zip` manually to the release.

## If CI fails

1. Read the failing job, not only the summary.
2. Reproduce locally with the same command.
3. Fix the cause; do not disable the gate.
4. Re-run the workflow.
5. If the failure is environmental, document it in the PR or issue.

Common causes:

- Node version below 22.18,
- missing `dist/` before `test:core`,
- stale manifest version after bumping `package.json`,
- bundle budget exceeded,
- Windows line endings in generated files.

## Copy-paste prompt for an AI coding agent

Use this after downloading/unzipping the project. It is intentionally explicit about not fabricating verification.

```text
You are working in the Cove repository at C:\Users\india\Downloads\Cove\cove.

Goal: publish the finished, verified project to https://github.com/DevAnimecx/cove without losing local work.

Steps:
1. Run `git status --short` and `git log --oneline -5`. Report the branch, the number of commits, and any uncommitted files.
2. Do not delete or overwrite user changes. If there are uncommitted changes, inspect them and commit them with a Conventional Commit message that describes the real work.
3. Run the release gates: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:core`, `npm run budget`, `npm run verify`. If any command fails, stop and report the exact errors. Do not claim success without the command output.
4. Confirm `package.json` version, `public/manifest.json`, `manifest.json`, and `manifest.firefox.json` agree. Run `npm run sync:version` if they do not.
5. Confirm `README.md`, `docs/`, `llms.txt`, `humans.txt`, `.well-known/security.txt`, and `assets/seo/structured-data.json` exist.
6. Add the remote if needed:
   `git remote add origin https://github.com/DevAnimecx/cove.git`
   If origin exists, run `git remote set-url origin https://github.com/DevAnimecx/cove.git`.
7. Push `main`: `git push -u origin main`.
8. Push the release tag only if the version is final: `git tag -a v0.1.1 -m "Cove v0.1.1"` then `git push origin v0.1.1`.
9. Report the remote URL, branch, latest commit hash, push result, and the GitHub Actions run URL. If the push fails because the remote is non-empty, stop and ask before force-pushing.
10. Do not claim the repository is live, the release is published, or CI is green unless you verified it.

Constraints:
- Do not add analytics, trackers, or a Cove server.
- Do not invent awards, store listings, or benchmark numbers.
- Do not rewrite git history or force-push without explicit confirmation.
```

## After the push

- Set About, topics, and social preview using [Repo metadata](repo-metadata.md).
- Verify the release assets and checksums.
- Pin the start-here issue.
- Enable Discussions.
- Run a clean install from the GitHub release ZIP.
- Post the launch using [Launch kit](launch-kit.md).

## Related reading

- [Releasing](releasing.md)
- [Repo metadata](repo-metadata.md)
- [Launch kit](launch-kit.md)
- [Security](security.md)
