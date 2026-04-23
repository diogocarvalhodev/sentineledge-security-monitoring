# Threat Model (SentinelEdge Public Demo)

## Scope

Assets:
- authentication tokens and user credentials
- alert records and image snapshots
- camera metadata and zone definitions
- system settings and audit-related records

Components:
- React frontend
- FastAPI backend
- PostgreSQL
- Redis
- Docker host volumes

## Trust Boundaries

1. Browser to backend API/WebSocket.
2. Backend to PostgreSQL and Redis network.
3. Container boundary to host-mounted uploads volume.

## Main Threats

- brute-force login attempts
- JWT theft/replay
- unauthorized admin action attempts
- leakage of secrets through logs/config
- tampering or accidental deletion of alert evidence

## Current Mitigations

- hashed passwords (bcrypt)
- JWT authentication on protected routes
- role checks for admin endpoints
- demo integration flags to avoid accidental external calls
- deterministic bootstrap admin creation only when user is absent

## Remaining Risks

- no centralized SIEM export in demo scope
- no immutable audit/event ledger
- demo credentials may remain weak if not changed

## Recommended Next Controls

1. Add login throttling and lockout policy with persistent counters.
2. Add refresh-token rotation and revocation support.
3. Add signed audit trail for critical actions.
4. Add secret scanning and dependency security checks in CI.
