# Resumo Executivo para Recrutador

## Proposta do projeto

O SentinelEdge é uma demo pública de plataforma de monitoramento de segurança com foco em arquitetura backend/full stack, operação e segurança aplicada. O projeto foi estruturado para demonstrar maturidade de engenharia e não apenas interface visual.

## O que este projeto evidencia no candidato

- capacidade de desenhar arquitetura orientada a eventos e operação em tempo real;
- domínio de backend Python com FastAPI, autenticação JWT e modelagem de dados;
- integração frontend/backend com React e gestão de estado para cenários operacionais;
- prática de documentação técnica com threat model e runbook versionados;
- visão de ciclo de vida de software com pipeline CI ativo.

## Escopo técnico demonstrado

- APIs de autenticação, câmeras, zonas, alertas, dashboard e configurações;
- notificações em tempo real via WebSocket;
- persistência em PostgreSQL e suporte a realtime com Redis;
- execução local padronizada por Docker Compose;
- modo demo frontend-only com mock para apresentação pública.

## Evidências de maturidade

- threat model: docs/threat-model.md
- runbook de incidente: docs/runbooks/incident-response.md
- CI em GitHub Actions: .github/workflows/ci.yml
- smoke test de endpoints: test_all_endpoints.py

## Leitura de senioridade

O projeto demonstra boa base para posição backend/full stack com responsabilidade técnica:

- separação de responsabilidades entre camadas;
- preocupação explícita com riscos de segurança;
- orientação a operação e resposta a incidente;
- clareza entre “escopo de demo” e “requisitos de produção”.

## Próximo nível esperado para produção real

- hardening de autenticação e sessões;
- trilha de auditoria imutável para ações críticas;
- observabilidade avançada e automação de resposta;
- testes automatizados com maior cobertura e gates de segurança no CI.
