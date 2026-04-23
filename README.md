# SentinelEdge Security Monitoring - Public Demo

Production-inspired security monitoring platform designed for portfolio demonstration.

This repository is a **demo-safe version** focused on showing engineering quality, incident workflows, and secure system design without exposing sensitive or commercially valuable implementation details.

## Overview

SentinelEdge is an end-to-end monitoring system for camera-based incident detection:

- Real-time camera monitoring and alert lifecycle
- Incident visibility through dashboard, reports, and maps
- Role-based access control for operations and administration
- WebSocket notifications for near real-time operational awareness

## Problem

Security and operations teams often struggle with:

- delayed incident visibility
- fragmented monitoring tools
- weak auditability during incident handling
- high setup complexity for proof-of-concept environments

## Solution

SentinelEdge provides a unified platform where events are detected, stored, visualized, and acknowledged in one operational workflow.

The demo version keeps the architecture realistic while making local execution simple and safe for public sharing.

## Demo Scope (Public Version)

This repository intentionally includes only portfolio-safe capabilities.

### Included

- JWT authentication and role-based access
- Camera management and stream testing
- Alert creation, listing, acknowledgment, and analytics
- Dashboard metrics and operational health endpoint
- WebSocket-based live updates
- Frontend pages for Dashboard, Cameras, Alerts, Reports, Map, Settings

### Simplified or Mocked

- External integrations (for example, Telegram test endpoint) can run in mock mode
- Local/mock video sources are allowed in demo mode to avoid dependence on real RTSP infrastructure
- AI engine can be disabled by default for lightweight local setup

### Not Exposed in This Demo

- Commercial tuning logic and proprietary operational heuristics
- Real customer infrastructure details and secrets
- Production deployment hardening specifics

## Architecture (Based on Current Code)

```text
Frontend (React + Vite + Zustand)
  -> REST + JWT -> FastAPI Backend
  -> WebSocket ----^        |
                            |
                     PostgreSQL (system of record)
                            |
                         Redis (realtime support)
                            |
                     Optional AI Detector (YOLO/OpenCV)
```

### Backend highlights

- FastAPI app entrypoint and router orchestration in `backend/app/main.py`
- Domain APIs under `backend/app/api`
- Core services and security in `backend/app/core`
- SQLAlchemy models in `backend/app/models/models.py`

### Frontend highlights

- Route composition in `frontend/src/App.jsx`
- Global state and API/WebSocket client in `frontend/src/store/useStore.js`
- Layout/navigation and realtime status in `frontend/src/components/Layout.jsx`

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, Pydantic
- Data: PostgreSQL, Redis
- Realtime: WebSocket
- Detection pipeline (optional): OpenCV, PyTorch, Ultralytics YOLO
- Frontend: React, Vite, Zustand, Tailwind CSS
- Containers: Docker, Docker Compose

## Curated Features For Recruiter Impact

- Monitoring: live camera status, dashboard KPIs, health telemetry
- Automation: alert creation flow, detector lifecycle, scheduled cleanup endpoints
- Incident handling: alert queue, acknowledgment flow, review metadata
- Reliability: health checks, resilient stream reconnect behavior, environment-driven config

## Security Perspective

This project demonstrates practical secure-by-design decisions:

- JWT-based authentication and role-restricted endpoints
- Admin-only controls for sensitive actions
- Configurable CORS and environment-based secrets
- Demo-safe integration controls to prevent accidental external calls
- Separation of demo behavior and production-like behavior via feature flags

### Demo-safe controls added

- `DEMO_MODE=true`
- `ALLOW_LOCAL_VIDEO_SOURCES=true`
- `ENABLE_EXTERNAL_INTEGRATIONS=false`

## Run Locally

## 1. Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only if running frontend outside Docker)
- Python 3.11+ (only if running backend outside Docker)

## 2. Configure environment

```bash
cp .env.example .env
```

Important defaults in demo mode:

- AI engine disabled for lightweight startup
- external integrations mocked
- local video sources allowed

## 3. Start with Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 4. Login

Default demo credentials:

- username: `admin`
- password: `admin`

## 5. Optional smoke test

```bash
python test_all_endpoints.py
```

## Demo Walkthrough (Suggested)

1. Login as admin
2. Create a zone and camera
3. Start camera monitoring
4. Open dashboard and observe live stats
5. Trigger or create an alert and acknowledge it
6. Validate realtime updates (WebSocket)
7. Show health endpoint and discuss reliability controls

## Suggested Screenshot Set

1. Login page
2. Dashboard with KPIs and recent alerts
3. Camera management and stream snapshot
4. Alerts queue and acknowledgment flow
5. Reports page (charts/filters)
6. Map view with monitored zones
7. Settings page with security and integration controls

## Repository Structure

```text
backend/
  app/
    api/          # REST endpoints
    core/         # security, config, detector, notifications
    models/       # SQLAlchemy models
    schemas/      # request/response schemas
frontend/
  src/
    components/   # UI and realtime widgets
    pages/        # route-level views
    store/        # Zustand global state
database/
  init.sql
docker-compose.yml
```

## Recommended Next Improvements

- split API routers by bounded context package naming (for example, `incident`, `monitoring`, `admin`)
- move detector-specific code behind a service interface for easier mock injection
- add a seeded demo dataset command (zones, cameras, alerts)
- expand CI pipeline with dependency scanning and integration tests
- add postmortem template and release checklist markdown

## Engineering Ops Assets

- CI workflow: `.github/workflows/ci.yml`
- Threat model: `docs/threat-model.md`
- Incident runbook: `docs/runbooks/incident-response.md`
- License: `LICENSE`

## Recruiter View (US Market)

### Current perception (before demo curation)

- Strong technical depth but mixed product narrative
- Some hardcoded/local assumptions reduce portability
- External integration behavior not clearly controlled for public demo

### Perception after this demo curation

- Clear ownership of backend + platform concerns
- Better signal of SRE + Security mindset (reliability, observability, incident workflows)
- More interview-ready because architecture and business tradeoffs are explicit

### What helps this stand out in interviews

- Explain design choices using risk and reliability language
- Show one live incident flow end-to-end in under 5 minutes
- Discuss how demo flags map to production controls
- Highlight what was intentionally hidden to protect commercial IP

## License and Usage

This repository is intended for portfolio demonstration and technical evaluation.
Do not use it in production as-is without hardening, threat modeling, and security review.
