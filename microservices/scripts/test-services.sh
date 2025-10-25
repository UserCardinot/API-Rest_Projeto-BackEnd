#!/bin/bash

echo "🧪 Testando serviços..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testando $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC} (Status: $response)"
    else
        echo -e "${RED}❌ FALHOU${NC} (Status: $response, esperado: $expected_status)"
    fi
}

echo ""
echo "🔍 Testando health checks..."

# Testar Eureka Server
test_endpoint "Eureka Server" "http://localhost:8761/health" "200"

# Testar API Gateway
test_endpoint "API Gateway" "http://localhost:8080/health" "200"

# Testar Auth Service
test_endpoint "Auth Service" "http://localhost:8081/health" "200"

# Testar Core Service
test_endpoint "Core Service" "http://localhost:8082/health" "200"

echo ""
echo "🔐 Testando autenticação..."

# Testar registro de usuário
echo -n "Testando registro de usuário... "
register_response=$(curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "123456",
    "role": "user"
  }')

if echo "$register_response" | grep -q "Usuário criado com sucesso"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FALHOU${NC}"
    echo "Resposta: $register_response"
fi

# Testar login
echo -n "Testando login... "
login_response=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "123456"
  }')

if echo "$login_response" | grep -q "accessToken"; then
    echo -e "${GREEN}✅ OK${NC}"
    
    # Extrair token para testes posteriores
    token=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "Token extraído: ${token:0:20}..."
else
    echo -e "${RED}❌ FALHOU${NC}"
    echo "Resposta: $login_response"
fi

echo ""
echo "🏢 Testando Core Service..."

# Testar listagem de empresas (deve falhar sem token)
echo -n "Testando acesso sem token... "
empresas_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/empresa)
if [ "$empresas_response" = "401" ]; then
    echo -e "${GREEN}✅ OK${NC} (Acesso negado corretamente)"
else
    echo -e "${RED}❌ FALHOU${NC} (Status: $empresas_response)"
fi

echo ""
echo "✅ Testes concluídos!"