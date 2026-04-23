# SentinelEdge Security Monitoring

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=0B1021)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Data-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Realtime-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)

Public engineering demo for real-time security monitoring, designed to showcase backend/full-stack architecture, operational readiness, and security thinking for international hiring.

Live demo: https://sentineledge-security-monitoring.vercel.app/

## How to explore in 2 minutes

1. Open the live demo and sign in using demo mode.
2. Navigate through Dashboard, Alerts, Cameras, and Map to validate the operational flow.
3. Open Settings to review administrative controls and integration settings in safe demo mode.

## Problem Context

Physical security platforms often struggle with three recurring issues:

- limited operational visibility for real-time event triage;
- tight coupling between video ingestion, alert logic, and operator interfaces;
- weak security and operational discipline in public demo environments.

SentinelEdge addresses this with an operations-oriented engineering approach:

- centralized alert lifecycle (detection, triage, confirmation);
- operational traceability through dashboards, maps, and reports;
- clear separation between public demo scope and production-grade requirements.

## Public Demo Scope

### What the demo currently delivers

- JWT authentication with role-based access on sensitive routes;
- camera, zone, alert, and system settings management;
- real-time update channel through WebSocket;
- operational dashboard and evidence visualization;
- standardized local execution with Docker Compose;
- frontend-only mock mode for portfolio-friendly public demos.

### What is intentionally out of scope

- customer secrets and real production integrations;
- full production hardening policies;
- proprietary business logic details.

## Architecture and Data Flow

### High-level view

```text
React Frontend (Vite + Zustand)
  -> HTTP/REST with JWT -> FastAPI Backend
  -> WebSocket ----------^          |
                                    |
                          PostgreSQL (system of record)
                                    |
                         Redis (realtime support)
                                    |
             Optional Detector (YOLO/OpenCV for demo scenarios)
```

### Core operational flow

1. An operator authenticates in the frontend and receives a JWT token.
2. The frontend consumes protected APIs for operational actions and reads.
3. The backend persists entities in PostgreSQL (users, cameras, zones, alerts).
4. Operational events are pushed to clients over WebSocket.
5. When detector mode is enabled, alert evidence is stored in uploads and indexed for retrieval.

### Technical stack

- Backend: Python, FastAPI, SQLAlchemy, Pydantic
- Frontend: React, Vite, Zustand, Tailwind CSS
- Data: PostgreSQL, Redis
- Realtime: WebSocket
- Optional AI: PyTorch, Ultralytics YOLO, OpenCV
- Local platform: Docker and Docker Compose

## Applied Security

The public demo keeps a practical baseline of application security:

- JWT authentication for protected routes;
- bcrypt password hashing;
- role-based authorization for administrative operations;
- configurable CORS policy;
- environment-driven admin bootstrap controls;
- explicit separation between demo mode and external integrations.

Supporting security artifacts:

- threat model: docs/threat-model.md
- incident response runbook: docs/runbooks/incident-response.md

## Operations and Runbook

### Quick local start

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start the stack:

```bash
docker compose up --build
```

3. Main endpoints:

- frontend: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

4. Default demo credentials:

- username: admin
- password: admin

### Demo operational validation

Run endpoint smoke tests:

```bash
python test_all_endpoints.py
```

### Incident response reference

The triage and recovery procedure is documented in docs/runbooks/incident-response.md and includes:

- severity classification;
- first 10-minute triage;
- Docker-based recovery actions;
- post-incident checklist.

## Technical Maturity Evidence

### Threat model

- file: docs/threat-model.md
- covers critical assets, trust boundaries, key threats, current controls, and residual risks.

### Runbook

- file: docs/runbooks/incident-response.md
- defines a response process focused on availability and quick demo recovery.

### CI pipeline

- file: .github/workflows/ci.yml
- current validations:
  - Python source compilation checks via compileall;
  - Docker Compose syntax validation;
  - frontend build via Vite.

### Existing tests

- end-to-end HTTP smoke script: test_all_endpoints.py
- frontend build verification in CI;
- backend syntax validation in CI.

### Missing tests to increase confidence

- backend unit tests (services, business rules, security layer);
- database/auth integration tests in an isolated pipeline environment;
- frontend E2E tests for login and triage workflows;
- load and resiliency tests for WebSocket and event ingestion.

## From Demo to Production

### What is already robust

- layered architecture with clear responsibilities;
- coherent functional surface for security operations;
- baseline application security (authentication and authorization);
- versioned operational and risk documentation;
- active CI pipeline preventing basic regressions.

### What is still needed for real hardening

- centralized secret management and formal rotation policies;
- refresh-token strategy, token revocation, and shorter session lifetimes;
- immutable audit trail for critical actions;
- login rate limiting and brute-force protections;
- full observability (metrics, tracing, and production alerting);
- SAST/DAST and dependency scanning as mandatory CI/CD gates;
- tested backup and disaster recovery routines;
- network segmentation and zero-trust posture for internal services.

## Frontend-Only Demo on Vercel

For a visual-only showcase without backend services:

- build command: npm run build
- output directory: dist
- recommended variable: VITE_DEMO_MOCK=true

In this mode, the frontend uses seeded mock data for portfolio navigation.

## Repository Structure

```text
backend/
  app/
    api/
    core/
    models/
    schemas/
frontend/
  src/
    components/
    pages/
    store/
database/
  init.sql
docs/
  threat-model.md
  runbooks/
    incident-response.md
.github/workflows/
  ci.yml
```

## Usage Notice

This repository is a public engineering demo.
Before production use, execute the hardening plan described in this document and run formal security, operations, and compliance reviews.

License:

- English (canonical): LICENSE
- Portuguese (reference): LICENSE.pt-BR.md
