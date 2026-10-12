# Private cookbook application

Source for a cookbook with individual accounts, recipe sharing, ingredient scaling, categories, file attachments and administrator controls. This copy contains generic demonstration data and artwork; it contains no original recipes, accounts, uploaded photos, hosting identity or deployment database.

Use Node.js 22.13 or later. Install the pinned dependencies with `npm ci --ignore-scripts`, then run `npm run build` and `npx tsc --noEmit`. The source uses Vinext, D1 and R2 bindings. `.openai/hosting.json` contains an intentionally unusable demonstration Site identity and local binding names; register your own project before any deployment.

Local integration tests must run against a new local Worker/database. `TEST_ORIGIN` must point to localhost; `TEST_ADMIN_PASSWORD` supplies the test-only administrator password. Configure ADMIN_PASSWORD_HASH and ADMIN_PASSWORD_SALT in ignored local configuration, apply the tracked migrations with Wrangler's `--local` option, then run `node tests/access.mjs`. `tests/persistence.mjs seed` and `check` verify records across a local restart. Runtime secrets and generated output are excluded from Git.

Original photography is deliberately omitted. The included recipe illustrations are simple authored SVG examples. Required notices for the bundled framework plugin and shadcn/ui components are retained. Dependencies keep their own licenses. No new license has been assigned to first-party application code.
