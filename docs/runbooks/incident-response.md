# Incident Response Runbook

Idioma / Language: PT-BR | EN

## PT-BR (Portuguese - Brazil)

### Níveis de severidade

- SEV-1: indisponibilidade total da API, falha geral de autenticação, ou risco de exposição de dados.
- SEV-2: degradação parcial (atraso de alertas, instabilidade de stream de câmera).
- SEV-3: regressão menor sem impacto operacional crítico.

### Triagem imediata (primeiros 10 minutos)

1. Verificar status dos serviços:
   - `docker compose ps`
2. Inspecionar logs recentes:
   - `docker compose logs --tail=200 backend postgres redis frontend`
3. Validar saúde da API:
   - `GET /health`
4. Validar login demo:
   - `POST /auth/login` com credenciais de bootstrap configuradas

### Ações comuns de recuperação

1. Reiniciar somente o backend:
   - `docker compose up -d --build backend`
2. Se houver drift de credenciais/ambiente do banco:
   - revisar `.env` e variáveis do compose
3. Se for aceitável resetar estado no ambiente de demo:
   - `docker compose down -v`
   - `docker compose up -d --build`

### Validação de recuperação

1. `/health` retorna 200.
2. Login do admin funciona.
3. Endpoints-chave respondem (câmeras, alerts, settings, dashboard).
4. Frontend acessível na porta 3000.

### Checklist pós-incidente

1. Registrar timeline e causa raiz.
2. Ajustar scripts de smoke test quando necessário.
3. Atualizar README/runbook com o novo padrão de falha.

---

## EN (English)

### Severity levels

- SEV-1: full API outage, global authentication failure, or data exposure risk.
- SEV-2: partial degradation (delayed alerts, unstable camera streams).
- SEV-3: minor regression without critical operational impact.

### Immediate triage (first 10 minutes)

1. Check service status:
   - `docker compose ps`
2. Inspect recent logs:
   - `docker compose logs --tail=200 backend postgres redis frontend`
3. Validate API health:
   - `GET /health`
4. Validate demo login:
   - `POST /auth/login` with configured bootstrap credentials

### Common recovery actions

1. Restart backend only:
   - `docker compose up -d --build backend`
2. If DB credentials/environment drift is detected:
   - verify `.env` and compose variables
3. If state reset is acceptable in demo:
   - `docker compose down -v`
   - `docker compose up -d --build`

### Recovery validation

1. `/health` returns 200.
2. Admin login works.
3. Key endpoints respond (cameras, alerts, settings, dashboard).
4. Frontend is reachable on port 3000.

### Post-incident checklist

1. Capture timeline and root cause.
2. Add/adjust smoke validation scripts when needed.
3. Update README/runbook with the new failure pattern.
