# Panboy Website — Security Checklist

This repository is public and currently contains only the early Next.js migration scaffold.
It is **not** a verified backup or mirror of the live ChatGPT Sites database.

## Secrets

- Never commit `.env`, `.env.local`, service-role keys, database passwords, payment-provider server keys, or private keys.
- Use `.env.example` with **empty values only**. Store actual secrets in the private deployment provider's environment settings.
- `NEXT_PUBLIC_*` variables are visible in browser bundles. Only public values belong there.
- Supabase **service-role** keys must never be prefixed `NEXT_PUBLIC_`, imported into client components, or sent to browsers.
- Supabase public/anon keys are not a substitute for enabling Row Level Security (RLS) on every exposed table.
- Keep payment server keys and webhook validation server-side. Authenticate webhooks before marking anything paid.
- If a secret was ever exposed, **rotate it**, review logs/access, and investigate the history. Adding `.gitignore` does not remove previously committed secrets.

## Before enabling the database / login

1. Verify ownership and backups of the actual live database (this scaffold has no live database integration).
2. Implement Supabase auth and role-based authorization **on the server**, not just by hiding admin buttons.
3. Enable and test RLS for event, roster, member, finance, payment, blacklist, and admin data.
4. Avoid public access to private WhatsApp numbers, proof-of-payment files, and member financial records.
5. Validate input and uploaded files; limit file sizes and storage permissions.
6. Confirm that `npm run build` and dependency security checks pass before deployment.
7. Test changes on staging. **Do not alter production DNS or data** until migration is verified.

## Current limitations

- Database provisioning, RLS, admin login, and live website deployment have not been audited.
- Remote image optimization is disabled for external hosts by default. Add only explicit, trusted remote hostnames when required.
- A file-level and Git-history path review cannot prove that no secret appeared elsewhere (for example inside an old commit, build log, or deployment environment).
