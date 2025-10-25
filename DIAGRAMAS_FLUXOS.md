# 📊 DIAGRAMAS E FLUXOS DO SISTEMA

## 🔄 FLUXO 1: REGISTRO DE NOVO USUÁRIO

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Cliente  │     │ API Gateway  │     │ Auth Service │     │ Core Service │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                     │                     │
     │ POST /register   │                     │                     │
     ├─────────────────►│                     │                     │
     │                  │                     │                     │
     │                  │ 1. Validar dados    │                     │
     │                  │────────────────┐    │                     │
     │                  │                │    │                     │
     │                  │◄───────────────┘    │                     │
     │                  │                     │                     │
     │                  │ 2. POST /auth/register                    │
     │                  ├────────────────────►│                     │
     │                  │                     │                     │
     │                  │                     │ 3. Hash senha       │
     │                  │                     │──────────┐          │
     │                  │                     │          │          │
     │                  │                     │◄─────────┘          │
     │                  │                     │                     │
     │                  │                     │ 4. Salvar no MongoDB│
     │                  │                     │──────────┐          │
     │                  │                     │          │          │
     │                  │                     │◄─────────┘          │
     │                  │                     │                     │
     │                  │ { authUserId, email }                     │
     │                  │◄────────────────────┤                     │
     │                  │                     │                     │
     │                  │ 5. POST /core/usuarios                    │
     │                  ├───────────────────────────────────────────►│
     │                  │ { authUserId, nome, cpf, empresaId }      │
     │                  │                     │                     │
     │                  │                     │                     │ 6. Criar perfil
     │                  │                     │                     │────────┐
     │                  │                     │                     │        │
     │                  │                     │                     │◄───────┘
     │                  │                     │                     │
     │                  │                     │ 7. Publicar evento  │
     │                  │                     │  "user.created"     │
     │                  │                     │◄────────────────────┤
     │                  │                     │     (RabbitMQ)      │
     │                  │                     │                     │
     │                  │ { success, usuario }                      │
     │                  │◄───────────────────────────────────────────┤
     │                  │                     │                     │
     │ { success, usuario }                   │                     │
     │◄─────────────────┤                     │                     │
     │                  │                     │                     │
```

**Pontos Críticos:**
- ✅ Se Auth Service falha, não criar no Core
- ✅ Se Core Service falha, deletar do Auth (compensação)
- ✅ Usar transações ou padrão SAGA
- ✅ Evento assíncrono para notificações (email, cache, etc)

---

## 🔐 FLUXO 2: LOGIN E AUTENTICAÇÃO

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Cliente  │     │ API Gateway  │     │ Auth Service │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                     │
     │ POST /login      │                     │
     ├─────────────────►│                     │
     │ {email, senha}   │                     │
     │                  │                     │
     │                  │ POST /auth/login    │
     │                  ├────────────────────►│
     │                  │ {email, senha}      │
     │                  │                     │
     │                  │                     │ 1. Buscar usuário
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │                     │ 2. Verificar bloqueio
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │                     │ 3. Comparar senha
     │                  │                     │   (bcrypt.compare)
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │                     │ 4. Gerar JWT tokens
     │                  │                     │    - Access (15min)
     │                  │                     │    - Refresh (7 dias)
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │                     │ 5. Salvar refresh token
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │ { accessToken,      │
     │                  │   refreshToken,     │
     │                  │   expiresIn }       │
     │                  │◄────────────────────┤
     │                  │                     │
     │ { accessToken,   │                     │
     │   refreshToken,  │                     │
     │   expiresIn }    │                     │
     │◄─────────────────┤                     │
     │                  │                     │
     │ ARMAZENA TOKENS  │                     │
     │ (localStorage    │                     │
     │  ou cookie)      │                     │
     │────────┐         │                     │
     │        │         │                     │
     │◄───────┘         │                     │
     │                  │                     │
```

---

## 🔄 FLUXO 3: REQUISIÇÃO AUTENTICADA

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Cliente  │     │ API Gateway  │     │ Core Service │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                     │
     │ GET /usuarios/me │                     │
     │ Header:          │                     │
     │ Authorization:   │                     │
     │ Bearer {token}   │                     │
     ├─────────────────►│                     │
     │                  │                     │
     │                  │ 1. Extrair token    │
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
     │                  │ 2. Verificar JWT    │
     │                  │   (jwt.verify)      │
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
     │                  │ 3. Verificar RBAC   │
     │                  │   (roles/permissions)
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
     │                  │ 4. Rate Limiting    │
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
     │                  │ 5. Proxy para serviço
     │                  ├────────────────────►│
     │                  │ + userId no header  │
     │                  │                     │
     │                  │                     │ 6. Processar
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │ { usuario }         │
     │                  │◄────────────────────┤
     │                  │                     │
     │ { usuario }      │                     │
     │◄─────────────────┤                     │
     │                  │                     │
```

**Otimizações:**
- ✅ Gateway valida JWT localmente (não precisa chamar Auth Service)
- ✅ Cache de permissões no Gateway (Redis)
- ✅ Rate limiting por usuário/IP

---

## 🔄 FLUXO 4: REFRESH TOKEN

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Cliente  │     │ API Gateway  │     │ Auth Service │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                     │
     │ Access Token     │                     │
     │ EXPIROU!         │                     │
     │                  │                     │
     │ Tentar requisição│                     │
     ├─────────────────►│                     │
     │                  │                     │
     │                  │ Token expirado!     │
     │ 401 Unauthorized │                     │
     │◄─────────────────┤                     │
     │                  │                     │
     │ POST /refresh    │                     │
     │ {refreshToken}   │                     │
     ├─────────────────►│                     │
     │                  │                     │
     │                  │ POST /auth/refresh  │
     │                  ├────────────────────►│
     │                  │ {refreshToken}      │
     │                  │                     │
     │                  │                     │ 1. Verificar token
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │                     │ 2. Verificar no banco
     │                  │                     │    (não revogado)
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │                     │ 3. Gerar novo Access
     │                  │                     │────────┐
     │                  │                     │        │
     │                  │                     │◄───────┘
     │                  │                     │
     │                  │ { accessToken }     │
     │                  │◄────────────────────┤
     │                  │                     │
     │ { accessToken }  │                     │
     │◄─────────────────┤                     │
     │                  │                     │
     │ ARMAZENA NOVO    │                     │
     │ ACCESS TOKEN     │                     │
     │────────┐         │                     │
     │        │         │                     │
     │◄───────┘         │                     │
     │                  │                     │
     │ RETENTA          │                     │
     │ REQUISIÇÃO       │                     │
     │ ORIGINAL         │                     │
     ├─────────────────►│                     │
     │                  │                     │
```

**Segurança:**
- ✅ Refresh Token rotativo (novo a cada uso)
- ✅ Limitar quantidade de refresh tokens por usuário
- ✅ Refresh Token armazenado no banco (pode ser revogado)
- ✅ Access Token stateless (não precisa consultar banco)

---

## 🔄 FLUXO 5: COMUNICAÇÃO VIA EVENTOS (RabbitMQ)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Core Service │     │  RabbitMQ    │     │ Email Service│     │ Cache Service│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │                     │
       │ 1. Criar usuário   │                     │                     │
       │────────┐           │                     │                     │
       │        │           │                     │                     │
       │◄───────┘           │                     │                     │
       │                    │                     │                     │
       │ 2. Publicar evento │                     │                     │
       │ "user.created"     │                     │                     │
       ├───────────────────►│                     │                     │
       │                    │                     │                     │
       │                    │ 3. Fanout para      │                     │
       │                    │    subscribers      │                     │
       │                    ├────────────────────►│                     │
       │                    │                     │                     │
       │                    │                     │ 4. Enviar email     │
       │                    │                     │────────┐            │
       │                    │                     │        │            │
       │                    │                     │◄───────┘            │
       │                    │                     │                     │
       │                    │                     │ 5. Publicar         │
       │                    │                     │   "email.sent"      │
       │                    │◄────────────────────┤                     │
       │                    │                     │                     │
       │                    │ 6. Fanout           │                     │
       │                    ├─────────────────────────────────────────►│
       │                    │                     │                     │
       │                    │                     │                     │ 7. Invalidar cache
       │                    │                     │                     │────────┐
       │                    │                     │                     │        │
       │                    │                     │                     │◄───────┘
       │                    │                     │                     │
       │ Operação completa! │                     │                     │
       │ (mas processamento │                     │                     │
       │  assíncrono ainda  │                     │                     │
       │  acontecendo)      │                     │                     │
       │                    │                     │                     │
```

**Vantagens:**
- ✅ Desacoplamento total entre serviços
- ✅ Core Service não precisa esperar email ser enviado
- ✅ Se Email Service cair, mensagem fica na fila
- ✅ Fácil adicionar novos consumidores (ex: SMS Service)

---

## 🔄 FLUXO 6: CIRCUIT BREAKER (Proteção contra Falhas)

```
ESTADO: CLOSED (Normal)
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Gateway  │     │ Circuit      │     │ Auth Service │
└────┬─────┘     │ Breaker      │     └──────┬───────┘
     │           └──────┬───────┘            │
     │                  │                     │
     │ Requisição 1     │                     │
     ├─────────────────►│────────────────────►│ ✅ Sucesso
     │                  │◄────────────────────┤
     │◄─────────────────┤                     │
     │                  │                     │
     │ Requisição 2     │                     │
     ├─────────────────►│────────────────────►│ ✅ Sucesso
     │                  │◄────────────────────┤
     │◄─────────────────┤                     │
     │                  │                     │

ESTADO: OPEN (Muitas falhas!)
     │                  │                     │
     │ Requisição 3     │                     │
     ├─────────────────►│────────────────────►│ ❌ Timeout!
     │                  │   ⏱ (3s)            │
     │                  │                     │
     │ Requisição 4     │                     │
     ├─────────────────►│────────────────────►│ ❌ Erro!
     │                  │                     │
     │                  │                     │
     │                  │ Taxa de erro > 50%  │
     │                  │ ABRIR CIRCUITO!     │
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
     │ Requisição 5     │                     │
     ├─────────────────►│ ❌ BLOQUEADO!       │
     │                  │ (não chama serviço) │
     │ ⚡ Fallback      │                     │
     │◄─────────────────┤                     │
     │                  │                     │
     │ ... 30 segundos ...                    │
     │                  │                     │

ESTADO: HALF_OPEN (Testando)
     │                  │                     │
     │                  │ Timeout passou      │
     │                  │ TESTAR SERVIÇO      │
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
     │ Requisição 6     │                     │
     ├─────────────────►│────────────────────►│ ✅ Sucesso!
     │                  │◄────────────────────┤
     │◄─────────────────┤                     │
     │                  │                     │
     │                  │ FECHAR CIRCUITO     │
     │                  │ (voltar ao normal)  │
     │                  │────────┐            │
     │                  │        │            │
     │                  │◄───────┘            │
     │                  │                     │
```

**Configuração Recomendada:**
```javascript
{
  timeout: 3000,              // 3 segundos
  errorThresholdPercentage: 50, // 50% de erro
  resetTimeout: 30000         // 30 segundos
}
```

---

## 🔍 FLUXO 7: SERVICE DISCOVERY (Eureka)

```
INICIALIZAÇÃO:
┌──────────────┐     ┌──────────────┐
│ Auth Service │     │ Eureka Server│
└──────┬───────┘     └──────┬───────┘
       │                    │
       │ 1. Iniciar serviço │
       │────────┐           │
       │        │           │
       │◄───────┘           │
       │                    │
       │ 2. POST /register  │
       │ {serviceName,      │
       │  host, port}       │
       ├───────────────────►│
       │                    │
       │                    │ 3. Armazenar
       │                    │────────┐
       │                    │        │
       │                    │◄───────┘
       │                    │
       │ {instanceId}       │
       │◄───────────────────┤
       │                    │
       │ 4. Heartbeat       │
       │    a cada 20s      │
       ├───────────────────►│
       │                    │
       │      ... ⏱ ...     │
       │                    │
       ├───────────────────►│
       │                    │

DESCOBERTA:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ API Gateway  │     │ Eureka Server│     │ Auth Service │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │ GET /discover/     │                     │
       │   auth-service     │                     │
       ├───────────────────►│                     │
       │                    │                     │
       │                    │ 1. Buscar instâncias│
       │                    │    saudáveis        │
       │                    │────────┐            │
       │                    │        │            │
       │                    │◄───────┘            │
       │                    │                     │
       │                    │ 2. Load balancing   │
       │                    │    (Round Robin)    │
       │                    │────────┐            │
       │                    │        │            │
       │                    │◄───────┘            │
       │                    │                     │
       │ {host, port, id}   │                     │
       │◄───────────────────┤                     │
       │                    │                     │
       │ 3. Chamar serviço  │                     │
       │────────────────────────────────────────►│
       │                    │                     │
```

**Health Check Automático:**
```
Eureka Server (job a cada 30s)
├─ Verificar lastHeartbeat de cada instância
├─ Se > 60 segundos → Marcar como DOWN
├─ Remover da lista de instâncias disponíveis
└─ Log: "Instância auth-service-123 removida"
```

---

## 🎯 MATRIZ DE RESPONSABILIDADES

| Componente      | Responsabilidades                              | NÃO faz                           |
|----------------|-----------------------------------------------|-----------------------------------|
| **Eureka**     | • Registro de serviços<br>• Health checks<br>• Load balancing | • Roteamento<br>• Autenticação   |
| **Gateway**    | • Roteamento<br>• Validação JWT<br>• Rate limiting<br>• CORS | • Lógica de negócio<br>• Acesso a banco |
| **Auth**       | • Login/Registro<br>• JWT<br>• Recuperação senha | • CRUD de usuários<br>• Lógica de negócio |
| **Core**       | • Empresa/Usuário/Funcionário<br>• CRUD<br>• Validações | • Autenticação<br>• Roteamento  |
| **RabbitMQ**   | • Mensageria<br>• Filas<br>• Pub/Sub          | • Processamento<br>• Armazenamento |

---

## 🔐 MATRIZ DE SEGURANÇA POR CAMADA

```
┌───────────────────────────────────────────────────────┐
│ CAMADA 1: REDE                                        │
│ • HTTPS/TLS obrigatório                               │
│ • Firewall (apenas portas necessárias)                │
│ • VPN para acesso interno                             │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ CAMADA 2: API GATEWAY                                 │
│ • Rate Limiting (100 req/15min por IP)                │
│ • DDoS Protection                                     │
│ • CORS restrito                                       │
│ • Validação JWT                                       │
│ • WAF (Web Application Firewall)                      │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ CAMADA 3: MICROSSERVIÇOS                              │
│ • Validação de inputs (Joi)                           │
│ • Sanitização (XSS, SQL Injection)                    │
│ • RBAC (Role-Based Access Control)                    │
│ • Logs de auditoria                                   │
│ • Timeout em operações                                │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ CAMADA 4: BANCO DE DADOS                              │
│ • Criptografia em repouso (AES-256)                   │
│ • Criptografia em trânsito (TLS)                      │
│ • Usuário com privilégios mínimos                     │
│ • Backup automático                                   │
│ • Audit logs                                          │
└───────────────────────────────────────────────────────┘
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### Dashboard Recomendado (Grafana)

**1. Visão Geral**
```
┌─────────────────────────────────────────────────────┐
│ HEALTH STATUS                                       │
│ ✅ Eureka Server    ✅ API Gateway                   │
│ ✅ Auth Service     ✅ Core Service                  │
│ ✅ MongoDB Auth     ✅ MongoDB Core                  │
│ ✅ RabbitMQ                                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TAXA DE REQUISIÇÕES (req/s)                         │
│ Gateway: ████████████░░░░░░░░ 145 req/s            │
│ Auth:    ███████░░░░░░░░░░░░░  78 req/s            │
│ Core:    ██████████░░░░░░░░░░ 112 req/s            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LATÊNCIA (ms)                                       │
│ p50:  45ms  ████░░░░░░░░░░░░░░░░░░░░░░             │
│ p95: 180ms  ███████████░░░░░░░░░░░░░░░             │
│ p99: 420ms  ████████████████████░░░░░░             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TAXA DE ERRO (últimas 24h)                          │
│ 4xx: 2.3%  ██░░░░░░░░░░░░░░░░░░░░░░░░              │
│ 5xx: 0.1%  ░░░░░░░░░░░░░░░░░░░░░░░░░░              │
└─────────────────────────────────────────────────────┘
```

**2. Alertas Críticos**
```
🔴 CRITICAL (pager duty)
├─ Taxa de erro > 1% por 5 minutos
├─ Latência p99 > 2000ms por 5 minutos
├─ Serviço down por > 1 minuto
└─ Banco de dados inacessível

🟡 WARNING (email)
├─ Taxa de erro > 0.5% por 10 minutos
├─ Latência p95 > 1000ms por 10 minutos
├─ CPU > 80% por 15 minutos
└─ Memória > 85% por 15 minutos

🔵 INFO (log)
├─ Deploy concluído
├─ Novo serviço registrado
└─ Scaling automático ativado
```

---

## 🎓 GLOSSÁRIO

| Termo              | Significado                                                |
|-------------------|------------------------------------------------------------|
| **Circuit Breaker** | Padrão que previne cascata de falhas bloqueando chamadas |
| **Service Discovery** | Mecanismo para serviços se encontrarem dinamicamente   |
| **JWT**           | JSON Web Token - token stateless para autenticação        |
| **RBAC**          | Role-Based Access Control - controle de acesso por roles  |
| **SAGA**          | Padrão para transações distribuídas                        |
| **Event-Driven**  | Arquitetura baseada em eventos assíncronos                 |
| **Idempotência**  | Operação que pode ser repetida sem efeitos colaterais     |
| **Eventual Consistency** | Dados ficam consistentes "eventualmente"            |
| **Pub/Sub**       | Publisher/Subscriber - padrão de mensageria               |
| **API Gateway**   | Ponto único de entrada para os microsserviços             |
| **Health Check**  | Endpoint que verifica se serviço está saudável            |

---

## 🎯 PRÓXIMOS PASSOS

1. **Implementar Service Registry** (Eureka)
2. **Implementar Auth Service** com JWT
3. **Implementar Core Service** com domínios
4. **Implementar API Gateway** com roteamento
5. **Adicionar RabbitMQ** para eventos
6. **Dockerizar tudo** com Docker Compose
7. **Adicionar observabilidade** (Prometheus + Grafana)
8. **Testes E2E** completos
9. **Deploy em produção**

---

**Boa sorte na implementação! 🚀**
