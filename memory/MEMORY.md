# Memory Index

This file indexes everything in the Gearspot (Tiedottajanne Oy) memory system. Read this first, every session. Update it whenever something new is created or decided.

## Profiles
- [Customer Profile](customer-profile.md) — who buys, why, objections, their words *(template — not yet filled in)*
- [Brand Profile](brand-profile.md) — what Gearspot stands for, tone, claims we can/can't make *(template — not yet filled in)*
- [Product Profile](product-profile.md) — key products, pain points, angles *(template — not yet filled in)*

## Session Logs
- [2026-08-21](../logs/2026-08-21-log.md) — DB integration, mobile UI fixes and search filtering
- [2026-07-18](../logs/2026-07-18-log.md) — project setup

## Status
- Frontend built with React + Vite + Tailwind CSS.
- Dynamic data fetching service implemented (`src/services/api.js`) reading keys strictly from `.env.local`.
- Mobile responsive layout and live filtering (search text, region dropdown, category pills) implemented and active.

## Exported JSON
- [gearspot-project.json](../gearspot-project.json) — project metadata and profile template structure for local cloud or app import.
