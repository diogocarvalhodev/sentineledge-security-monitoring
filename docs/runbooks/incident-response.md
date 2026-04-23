# Incident Response Runbook

## Severity Levels

- SEV-1: API outage, auth failure for all users, or data exposure risk.
- SEV-2: partial degradation (alerts delayed, camera feeds unstable).
- SEV-3: minor feature regression without operational impact.

## Immediate Triage (First 10 Minutes)

1. Check service status:
   - docker compose ps
2. Inspect recent logs:
   - docker compose logs --tail=200 backend postgres redis frontend
3. Validate API health:
   - GET /health
4. Validate demo login:
   - POST /auth/login with configured bootstrap credentials

## Common Recovery Actions

1. Restart backend only:
   - docker compose up -d --build backend
2. If DB credentials/environment drift occurred:
   - verify .env and compose values
3. If state corruption is acceptable in demo:
   - docker compose down -v
   - docker compose up -d --build

## Recovery Validation

1. /health returns 200.
2. Login works for admin user.
3. Key endpoints respond (cameras, alerts, settings, dashboard).
4. Frontend is reachable at port 3000.

## Post-Incident Checklist

1. Capture timeline and root cause.
2. Add/adjust smoke validation scripts if needed.
3. Update README or runbook with the new failure mode.
