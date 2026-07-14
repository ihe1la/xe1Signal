# Changelog

## Unreleased

- Added an architecture and repository map plus an evidence-based project status.
- Reconciled registration and password-reset writes with the current Prisma user model.
- Made registration defaults atomic and schema-compatible.
- Stopped logging raw password-reset tokens and email addresses.
- Added focused password-reset token tests and deterministic ESLint configuration.
- Documented application origins and strict, disabled-by-default test-environment settings.
- Mounted the Auth.js route handler and added the global session provider.
- Added an owner-only, production-disabled, host-allowlisted internal environment with strict mode as the default.
- Restored the production build by fixing client search-param prerender boundaries.
