# DMRJ Scheduling audit, rebrand, and reliability plan

## Scope
Rebrand the existing application to **DMRJ Scheduling**, correct pricing and subscription messaging, make all unavailable payment actions honest, strengthen authentication behavior, and verify tenant security and compilation without rebuilding scheduling features.

## Implementation
1. **Brand and metadata**
   - Replace all visible `Cadence` / legacy scheduler branding with **DMRJ Scheduling** in navigation, authentication, marketing, pricing, billing, and footer content.
   - Standardize the slogan to “Smart scheduling for modern businesses.” and the description to “Appointment scheduling software for salons, clinics, spas and practices.”
   - Add unique, app-specific metadata to every user-facing page while preserving the standard description and social tags.

2. **Pricing and checkout honesty**
   - Keep Starter at $19/month, Professional at $39/month, and Business at $79/month.
   - Remove the annual discount calculation and every “2 months free” claim.
   - Keep monthly pricing active and show Annual as disabled with “Annual billing is coming soon.”
   - Add a reusable unavailable-checkout action, preserving the selected plan and cycle through sign-in and page reload, that shows exactly: “Payment checkout is not available yet. Please try again later.”
   - Wire every plan selection and upgrade action to that honest message; no plan status, transaction, or credit data will be changed.

3. **Subscription status cleanup**
   - Add a forward-only database migration that converts existing `trialing` rows to a non-paid state, changes the default, and removes `trialing` from the active status model without rebuilding application tables.
   - Display paid plan details only for an actual `active` subscription; otherwise show “No active subscription” or “Not subscribed.”
   - Preserve complimentary-credit access separately from subscription state.

4. **Authentication hardening**
   - Keep email/password only.
   - Add normalized input validation, password confirmation, clearer pending/error states, safe session restoration, cache clearing between users, reliable post-login redirects, and mobile-friendly form behavior. Inspect existing password recovery and preserve it if present.
   - Verify sign-up, sign-out, sign-in-after-sign-out, persistence after reload, and protected-page redirect behavior; avoid changing auth settings silently.

5. **Security audit and verification**
   - Review all row-level access rules for business-scoped tables, including customer and staff privacy, and close cross-tenant read/write gaps with additive migrations.
   - Confirm only the publishable browser credential is client-visible and no private credentials are present in application source.
   - Run the project security scanner, focused TypeScript check, lint/build diagnostics, and responsive browser checks for public, auth, pricing, dashboard, calendar, appointments, customers, staff, services, availability, billing, and upgrade flows. Do not publish automatically.

## Acceptance checks
- No visible old brand, `trialing`, or “2 months free” copy remains.
- Annual billing cannot be selected as a purchasable discounted option.
- Every plan/upgrade action reports unavailable checkout and never changes subscription state.
- Signed-out users cannot open protected pages; returning users can sign in after logout and remain signed in after reload.
- Tenant-owned records remain inaccessible outside the owning business under row-level rules.
- TypeScript and production build complete with zero errors.
