# Arquitetura de Microsserviços

## Estrutura do Projeto

```
microservices/
├── eureka-server/          # Servidor de descoberta de serviços
├── api-gateway/            # Gateway central de comunicação
├── auth-service/           # Serviço de autenticação e autorização
├── core-service/           # Serviço principal (empresa, usuário, funcionário)
├── docker-compose.yml      # Orquestração dos serviços
└── shared/                 # Bibliotecas compartilhadas
    ├── models/             # Modelos de dados compartilhados
    ├── utils/              # Utilitários comuns
    └── middleware/         # Middleware compartilhado
```

## Tecnologias Utilizadas

- **Node.js + Express**: Framework principal
- **Eureka**: Descoberta de serviços
- **JWT**: Autenticação
- **MongoDB**: Banco de dados
- **Docker**: Containerização
- **Redis**: Cache e sessões
- **Winston**: Logging
- **Helmet**: Segurança

## Segurança

- Autenticação JWT com refresh tokens
- Rate limiting por IP e usuário
- Validação de entrada em todas as APIs
- Criptografia de dados sensíveis
- Logs de auditoria
- CORS configurado adequadamente