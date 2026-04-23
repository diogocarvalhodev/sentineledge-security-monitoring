# Threat Model (Sentinel Public Demo)

Idioma / Language: PT-BR | EN

## PT-BR (Portuguese - Brazil)

### Escopo

Ativos:

- tokens de autenticação e credenciais de usuário
- registros de alerta e snapshots de imagem
- metadados de câmeras e zonas
- configurações do sistema e dados de auditoria

Componentes:

- frontend React
- backend FastAPI
- PostgreSQL
- Redis
- volumes do host Docker

### Fronteiras de confiança

1. Navegador para API/WebSocket do backend.
2. Backend para rede de PostgreSQL e Redis.
3. Fronteira de container para volume montado de uploads.

### Principais ameaças

- força bruta em login
- roubo/replay de JWT
- tentativas de ação administrativa não autorizada
- vazamento de segredos via logs/configuração
- adulteração ou exclusão acidental de evidências de alerta

### Mitigações atuais

- senhas com hash (bcrypt)
- autenticação JWT em rotas protegidas
- verificação de papel em endpoints administrativos
- flags de demo para evitar chamadas externas acidentais
- bootstrap determinístico de admin apenas quando usuário não existe

### Riscos remanescentes

- sem exportação centralizada para SIEM no escopo demo
- sem trilha de auditoria imutável
- credenciais demo podem permanecer fracas se não alteradas

### Próximos controles recomendados

1. Adicionar throttling/lockout de login com contadores persistentes.
2. Adicionar rotação e revogação de refresh token.
3. Adicionar trilha de auditoria assinada para ações críticas.
4. Adicionar secret scanning e verificação de dependências no CI.

---

## EN (English)

### Scope

Assets:

- authentication tokens and user credentials
- alert records and image snapshots
- camera and zone metadata
- system settings and audit-related records

Components:

- React frontend
- FastAPI backend
- PostgreSQL
- Redis
- Docker host volumes

### Trust boundaries

1. Browser to backend API/WebSocket.
2. Backend to PostgreSQL and Redis network.
3. Container boundary to host-mounted uploads volume.

### Main threats

- brute-force login attempts
- JWT theft/replay
- unauthorized administrative actions
- secret leakage through logs/config
- tampering or accidental deletion of alert evidence

### Current mitigations

- password hashing (bcrypt)
- JWT authentication on protected routes
- role checks on admin endpoints
- demo integration flags to avoid accidental external calls
- deterministic bootstrap admin creation only when missing

### Remaining risks

- no centralized SIEM export in demo scope
- no immutable audit/event ledger
- demo credentials may remain weak if unchanged

### Recommended next controls

1. Add login throttling and lockout with persistent counters.
2. Add refresh-token rotation and revocation support.
3. Add signed audit trail for critical actions.
4. Add secret scanning and dependency checks in CI.
