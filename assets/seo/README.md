# SEO and AEO asset index

These files make Cove easier to discover, quote, and verify. They are static assets, not marketing claims.

| File | Purpose |
| :--- | :--- |
| [`llms.txt`](../../llms.txt) | Short, curated context for AI assistants and answer engines. |
| [`llms-full.txt`](../../llms-full.txt) | Complete project context, measurements, privacy ledger, FAQ, and limitations. |
| [`humans.txt`](../../humans.txt) | Maintainer, project, and tooling credits. |
| [`security.txt`](../../.well-known/security.txt) | RFC 9116 security contact and disclosure policy. |
| [`structured-data.json`](structured-data.json) | Schema.org `SoftwareApplication` and `FAQPage` JSON-LD for the website. |
| [`../screenshots/`](../screenshots/) | Real product screenshots used by the README and social preview. |

## Deployment notes

- `llms.txt`, `llms-full.txt`, `humans.txt`, and `.well-known/security.txt` are served from the repository root. If the website is deployed separately, copy them to the site's public root.
- Inject `structured-data.json` into the website `<head>` as `<script type="application/ld+json">` after replacing any placeholder origin. The canonical origin in this file is `https://appcove.vercel.app/`.
- Keep `softwareVersion`, test counts, and bundle size in sync with a release. Stale structured data is worse than none.
- Do not add rating, award, or store-availability properties until they are true.

## Related reading

- [SEO and AEO playbook](../../docs/seo-aeo.md)
- [Repository metadata](../../docs/repo-metadata.md)
- [Brand](../../docs/brand.md)
