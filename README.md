# SentinelEdge Security Monitoring

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=0B1021)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Data-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Realtime-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)

Idioma / Language: PT-BR | EN ([README.en.md](README.en.md))

Demo pública de engenharia para monitoramento de segurança em tempo real, com posicionamento técnico para entrevistas backend/full stack e revisão arquitetural.

Demo pública ao vivo: https://sentineledge-security-monitoring.vercel.app/

## Como explorar em 2 minutos

1. Acesse a demo pública e faça login no modo demonstração.
2. Navegue por Dashboard, Alerts, Cameras e Map para validar o fluxo operacional.
3. Abra Settings para observar controles administrativos e configuração de integrações em modo seguro de demo.

## Contexto do problema

Soluções de segurança física geralmente sofrem com três pontos críticos:

- baixa visibilidade operacional para triagem de eventos em tempo real;
- acoplamento excessivo entre captura de vídeo, lógica de alerta e interfaces de operação;
- pouca disciplina de segurança e operação em ambientes de demonstração pública.

O SentinelEdge foi estruturado para atacar esse cenário com uma abordagem de engenharia orientada a operações:

- centraliza o ciclo de vida de alertas (detecção, triagem e confirmação);
- mantém rastreabilidade operacional por dashboard, mapa e relatórios;
- separa claramente escopo de demo pública e requisitos de produção real.

## Escopo da demo pública

### O que a demo entrega hoje

- autenticação JWT com perfis e proteção de rotas sensíveis;
- gestão de câmeras, zonas, alertas e configurações do sistema;
- canal de atualizações em tempo real via WebSocket;
- dashboard operacional e visualização de evidências;
- execução local padronizada com Docker Compose;
- modo de demonstração frontend-only com mock para portfólio.

### O que fica propositalmente fora da demo

- segredos e integrações de clientes reais;
- políticas completas de hardening de produção;
- detalhes proprietários de negócio.

## Arquitetura e fluxo de dados

### Visão de alto nível

```text
Frontend React (Vite + Zustand)
  -> HTTP/REST com JWT -> Backend FastAPI
  -> WebSocket ----------^         |
                                   |
                         PostgreSQL (fonte de verdade)
                                   |
                        Redis (suporte a realtime)
                                   |
            Detector opcional (YOLO/OpenCV para cenários de demo)
```

### Fluxo operacional principal

1. O operador autentica no frontend e recebe token JWT.
2. O frontend consome APIs protegidas para leitura e ação operacional.
3. O backend persiste entidades em PostgreSQL (usuários, câmeras, zonas e alertas).
4. Eventos operacionais são distribuídos para o frontend por WebSocket.
5. Em cenários com detector habilitado, evidências de alerta são salvas em uploads e indexadas para consulta.

### Stack técnica

- Backend: Python, FastAPI, SQLAlchemy, Pydantic
- Frontend: React, Vite, Zustand, Tailwind CSS
- Dados: PostgreSQL, Redis
- Realtime: WebSocket
- IA opcional: PyTorch, Ultralytics YOLO, OpenCV
- Plataforma local: Docker e Docker Compose

## Segurança aplicada

A demo foi desenhada para ser pública sem mascarar engenharia mínima de segurança:

- autenticação baseada em JWT para rotas protegidas;
- hash de senha com bcrypt;
- autorização por papel para operações administrativas;
- controle de CORS via configuração;
- bootstrap administrativo controlado por variáveis de ambiente;
- separação explícita entre modo demo e integrações externas.

Material de apoio de segurança:

- threat model: docs/threat-model.md
- runbook de resposta a incidente: docs/runbooks/incident-response.md

## Operação e runbook

### Subida rápida local

1. Copie as variáveis de ambiente:

```bash
cp .env.example .env
```

2. Suba a stack:

```bash
docker compose up --build
```

3. Endpoints principais:

- frontend: http://localhost:3000
- API: http://localhost:8000
- documentação da API: http://localhost:8000/docs

4. Credencial padrão de demonstração:

- usuário: admin
- senha: admin

### Validação operacional da demo

Executar smoke test de endpoints:

```bash
python test_all_endpoints.py
```

### Referência de resposta a incidente

O procedimento de triagem e recuperação está em docs/runbooks/incident-response.md e cobre:

- classificação de severidade;
- triagem inicial dos primeiros 10 minutos;
- ações de recuperação em Docker;
- checklist pós-incidente.

## Prova de maturidade técnica

### Threat model

- arquivo: docs/threat-model.md
- cobre ativos críticos, fronteiras de confiança, ameaças principais, mitigações atuais e riscos residuais.

### Runbook

- arquivo: docs/runbooks/incident-response.md
- define processo de resposta com foco em disponibilidade e recuperação rápida da demo.

### Pipeline CI

- arquivo: .github/workflows/ci.yml
- validações atuais:
  - compilação de fontes Python com compileall;
  - validação sintática do Docker Compose;
  - build do frontend com Vite.

### Testes existentes

- smoke test HTTP ponta a ponta: test_all_endpoints.py
- verificação de build no CI para frontend;
- validação sintática do backend no CI.

### Testes faltantes para elevar cobertura

- testes unitários no backend (serviços, regras e camada de segurança);
- testes de integração com banco e autenticação em pipeline isolado;
- testes E2E do frontend com fluxo real de login e triagem;
- testes de carga e resiliência para WebSocket e ingestão de eventos.

## Do demo para produção

### O que já está robusto

- arquitetura em camadas com responsabilidades separadas;
- superfície funcional consistente para operação de segurança;
- baseline de segurança de aplicação (autenticação e autorização);
- documentação operacional e de risco já versionada;
- pipeline CI ativo para prevenir regressões básicas.

### O que falta para hardening real

- gestão de segredos com cofre dedicado e rotação formal;
- estratégia de refresh token, revogação e expiração curta de sessão;
- trilha de auditoria imutável para ações críticas;
- rate limiting e proteção contra força bruta no login;
- observabilidade completa (métricas, tracing e alertas em produção);
- SAST, DAST e varredura de dependências como gates obrigatórios no CI;
- política de backup e recuperação testada periodicamente;
- segmentação de rede e postura zero trust para serviços internos.

## Demo frontend-only no Vercel

Para apresentação visual sem backend:

- build command: npm run build
- output directory: dist
- variável recomendada: VITE_DEMO_MOCK=true

Nesse modo, o frontend usa dados simulados para navegação de portfólio.

## Estrutura do repositório

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

## Aviso de uso

Este repositório representa uma demo pública de engenharia.
Antes de uso em produção real, execute o plano de hardening descrito neste documento e realize revisão formal de segurança, operação e conformidade.

Licença:

- Inglês (canônica): LICENSE
- Português (referência): LICENSE.pt-BR.md
