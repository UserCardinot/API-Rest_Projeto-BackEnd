#!/bin/bash

echo "🚀 Iniciando ambiente de desenvolvimento..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# Construir e iniciar serviços
echo "🔨 Construindo e iniciando serviços..."
docker-compose up --build -d

# Aguardar serviços ficarem prontos
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 30

# Verificar status dos serviços
echo "📊 Verificando status dos serviços..."
docker-compose ps

echo ""
echo "✅ Ambiente iniciado com sucesso!"
echo ""
echo "🌐 Serviços disponíveis:"
echo "   • Eureka Server: http://localhost:8761"
echo "   • API Gateway: http://localhost:8080"
echo "   • Auth Service: http://localhost:8081"
echo "   • Core Service: http://localhost:8082"
echo ""
echo "📊 Dashboards:"
echo "   • Eureka Dashboard: http://localhost:8761/services"
echo "   • API Gateway Health: http://localhost:8080/health"
echo ""
echo "🔧 Para parar os serviços: docker-compose down"