# Sentinel Security Monitoring - Public Demo

Idioma / Language: PT-BR | EN

## PT-BR (Portuguese - Brazil)

### Visão Geral

Sentinel é uma plataforma de monitoramento de segurança inspirada em produção, publicada em versão segura para portfólio.

Objetivos principais:

- monitoramento de câmeras em tempo real
- ciclo de vida de alertas (criação, triagem, confirmação)
- visibilidade operacional via dashboard, mapas e relatórios
- notificações em tempo real por WebSocket

### Escopo desta versão pública

Incluído:

- autenticação JWT com controle por papéis
- gerenciamento de zonas e câmeras
- fluxo de alertas com analíticos básicos
- endpoint de saúde e operação via Docker Compose

Simplificado/mockado:

- integrações externas podem operar em modo mock
- fontes locais de vídeo podem ser habilitadas para demo
- motor de IA pode ficar desabilitado por padrão para setup leve

Não exposto:

- lógica comercial proprietária
- segredos e detalhes de infraestrutura real de clientes
- hardening completo de ambiente produtivo

### Arquitetura

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

### Stack Técnica

- Backend: Python, FastAPI, SQLAlchemy, Pydantic
- Dados: PostgreSQL, Redis
- Realtime: WebSocket
- IA (opcional): OpenCV, PyTorch, Ultralytics YOLO
- Frontend: React, Vite, Zustand, Tailwind CSS
- Containers: Docker, Docker Compose

### Rodando localmente

1. Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (apenas se rodar frontend fora do Docker)
- Python 3.11+ (apenas se rodar backend fora do Docker)

2. Configurar ambiente

```bash
cp .env.example .env
```

3. Subir stack

```bash
docker compose up --build
```

4. Acessos

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

5. Credenciais demo

- usuário: `admin`
- senha: `admin`

6. Smoke test opcional

```bash
python test_all_endpoints.py
```

### Deploy frontend-only no Vercel (modo mock)

Objetivo: publicar uma demo visual sem backend, usando dados fictícios e imagens locais.

1. Build e diretório de saída

- Build Command: `npm run build`
- Output Directory: `dist`

2. Variáveis de ambiente (Vercel)

- `VITE_DEMO_MOCK=true`
- `VITE_API_URL` opcional no modo mock

3. Comportamento no modo mock

- as chamadas REST são interceptadas no frontend
- WebSocket em localhost é desativado automaticamente
- dados seed de demo são carregados em memória
- imagens demo são servidas de `frontend/public/demo`

4. Acesso na demo

- login aceitando qualquer usuário/senha (sugestão: `admin` / `admin`)

### Estrutura do repositório

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
docker-compose.yml
```

### Materiais de operação

- CI: `.github/workflows/ci.yml`
- Threat model: `docs/threat-model.md`
- Runbook de incidente: `docs/runbooks/incident-response.md`
- Licença: `LICENSE`

### Uso

Este repositório é para demonstração técnica e portfólio.
Não use em produção sem hardening, threat modeling e revisão de segurança.

---

## EN (English)

### Overview

Sentinel is a production-inspired security monitoring platform published as a portfolio-safe public demo.

Core goals:

- real-time camera monitoring
- full alert lifecycle (create, triage, confirm)
- operational visibility through dashboards, maps, and reports
- real-time updates over WebSocket

### Scope of this public version

Included:

- JWT authentication with role-based access
- zone and camera management
- alert pipeline with basic analytics
- health endpoint and Docker Compose-based operation

Simplified/mocked:

- external integrations can run in mock mode
- local video sources can be enabled for demos
- AI engine can be disabled by default for lightweight setup

Not exposed:

- proprietary commercial logic
- customer secrets and real infrastructure details
- full production hardening specifics

### Architecture

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

### Tech stack

- Backend: Python, FastAPI, SQLAlchemy, Pydantic
- Data: PostgreSQL, Redis
- Realtime: WebSocket
- AI (optional): OpenCV, PyTorch, Ultralytics YOLO
- Frontend: React, Vite, Zustand, Tailwind CSS
- Containers: Docker, Docker Compose

### Running locally

1. Prerequisites

- Docker and Docker Compose
- Node.js 20+ (only if running frontend outside Docker)
- Python 3.11+ (only if running backend outside Docker)

2. Configure environment

```bash
cp .env.example .env
```

3. Start stack

```bash
docker compose up --build
```

4. Endpoints

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

5. Demo credentials

- username: `admin`
- password: `admin`

6. Optional smoke test

```bash
python test_all_endpoints.py
```

### Frontend-only Vercel deploy (mock mode)

Goal: publish a visual demo with no backend, using seeded fake data and local images.

1. Build and output

- Build Command: `npm run build`
- Output Directory: `dist`

2. Environment variables (Vercel)

- `VITE_DEMO_MOCK=true`
- `VITE_API_URL` is optional in mock mode

3. Mock mode behavior

- frontend intercepts REST calls
- localhost WebSocket is automatically disabled
- in-memory seeded demo data is loaded
- demo images are served from `frontend/public/demo`

4. Demo access

- login accepts any username/password (suggestion: `admin` / `admin`)

### Repository structure

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
docker-compose.yml
```

### Engineering ops assets

- CI: `.github/workflows/ci.yml`
- Threat model: `docs/threat-model.md`
- Incident runbook: `docs/runbooks/incident-response.md`
- License: `LICENSE`

### Usage

This repository is intended for technical demonstration and portfolio review.
Do not use it in production without proper hardening, threat modeling, and security review.
