const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.EUREKA_PORT || 8761;

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/eureka-server.log' })
  ]
});

// Middleware de segurança
app.use(helmet());
app.use(cors());
app.use(express.json());

// Registro de serviços (simulado)
const services = new Map();

// Endpoints do Eureka Server
app.get('/eureka/apps', (req, res) => {
  const apps = Array.from(services.values()).map(service => ({
    name: service.name,
    instance: [{
      instanceId: service.instanceId,
      hostName: service.hostName,
      app: service.name,
      ipAddr: service.ipAddr,
      status: service.status,
      overriddenStatus: 'UNKNOWN',
      port: { $: service.port, '@enabled': 'true' },
      securePort: { $: service.securePort, '@enabled': 'false' },
      countryId: 1,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn'
      },
      leaseInfo: {
        renewalIntervalInSecs: 30,
        durationInSecs: 90,
        registrationTimestamp: service.registrationTimestamp,
        lastRenewalTimestamp: service.lastRenewalTimestamp,
        evictionTimestamp: 0,
        serviceUpTimestamp: service.serviceUpTimestamp
      }
    }]
  }));

  res.json({ application: apps });
});

// Registro de serviço
app.post('/eureka/apps/:appName', (req, res) => {
  const { appName } = req.params;
  const serviceData = req.body;
  
  const service = {
    name: appName,
    instanceId: serviceData.instance?.instanceId || `${appName}-${Date.now()}`,
    hostName: serviceData.instance?.hostName || 'localhost',
    ipAddr: serviceData.instance?.ipAddr || '127.0.0.1',
    port: serviceData.instance?.port?.$ || 8080,
    securePort: serviceData.instance?.securePort?.$ || 8443,
    status: 'UP',
    registrationTimestamp: Date.now(),
    lastRenewalTimestamp: Date.now(),
    serviceUpTimestamp: Date.now()
  };

  services.set(service.instanceId, service);
  logger.info(`Serviço registrado: ${appName} - ${service.instanceId}`);
  
  res.status(204).send();
});

// Heartbeat do serviço
app.put('/eureka/apps/:appName/:instanceId', (req, res) => {
  const { appName, instanceId } = req.params;
  const service = services.get(instanceId);
  
  if (service) {
    service.lastRenewalTimestamp = Date.now();
    service.status = 'UP';
    logger.info(`Heartbeat recebido: ${appName} - ${instanceId}`);
    res.status(200).send();
  } else {
    res.status(404).json({ error: 'Serviço não encontrado' });
  }
});

// Cancelamento de registro
app.delete('/eureka/apps/:appName/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  if (services.has(instanceId)) {
    services.delete(instanceId);
    logger.info(`Serviço removido: ${instanceId}`);
    res.status(200).send();
  } else {
    res.status(404).json({ error: 'Serviço não encontrado' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP', 
    services: services.size,
    timestamp: new Date().toISOString()
  });
});

// Lista de serviços ativos
app.get('/services', (req, res) => {
  const activeServices = Array.from(services.values()).map(service => ({
    name: service.name,
    instanceId: service.instanceId,
    hostName: service.hostName,
    port: service.port,
    status: service.status,
    lastSeen: new Date(service.lastRenewalTimestamp).toISOString()
  }));
  
  res.json({ services: activeServices });
});

app.listen(PORT, () => {
  logger.info(`Eureka Server rodando na porta ${PORT}`);
  console.log(`🚀 Eureka Server iniciado na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/services`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});