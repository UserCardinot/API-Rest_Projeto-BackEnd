const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 8080;

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/gateway.log' })
  ]
});

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json());

// Configuração dos serviços
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
    health: '/health',
    routes: ['/auth/*', '/login', '/register', '/refresh']
  },
  core: {
    url: process.env.CORE_SERVICE_URL || 'http://localhost:8082',
    health: '/health',
    routes: ['/api/empresa/*', '/api/usuario/*', '/api/funcionario/*']
  }
};

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    // Verificar token com o serviço de auth
    const response = await axios.get(`${services.auth.url}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    req.user = response.data.user;
    next();
  } catch (error) {
    logger.error('Erro na autenticação:', error.message);
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

// Middleware de autorização por role
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

// Health check do gateway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    services: Object.keys(services)
  });
});

// Roteamento para Auth Service (sem autenticação)
app.use('/auth', createProxyMiddleware({
  target: services.auth.url,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': ''
  },
  onError: (err, req, res) => {
    logger.error('Erro no Auth Service:', err.message);
    res.status(503).json({ error: 'Serviço de autenticação indisponível' });
  }
}));

// Roteamento para Core Service (com autenticação)
app.use('/api/empresa', 
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  createProxyMiddleware({
    target: services.core.url,
    changeOrigin: true,
    onError: (err, req, res) => {
      logger.error('Erro no Core Service:', err.message);
      res.status(503).json({ error: 'Serviço principal indisponível' });
    }
  })
);

app.use('/api/usuario', 
  authenticateToken,
  createProxyMiddleware({
    target: services.core.url,
    changeOrigin: true,
    onError: (err, req, res) => {
      logger.error('Erro no Core Service:', err.message);
      res.status(503).json({ error: 'Serviço principal indisponível' });
    }
  })
);

app.use('/api/funcionario', 
  authenticateToken,
  authorizeRole(['admin', 'manager', 'hr']),
  createProxyMiddleware({
    target: services.core.url,
    changeOrigin: true,
    onError: (err, req, res) => {
      logger.error('Erro no Core Service:', err.message);
      res.status(503).json({ error: 'Serviço principal indisponível' });
    }
  })
);

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Rota de fallback
app.get('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    availableRoutes: [
      '/health',
      '/auth/*',
      '/api/empresa/*',
      '/api/usuario/*',
      '/api/funcionario/*'
    ]
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway iniciado na porta ${PORT}`);
  console.log(`🚀 API Gateway rodando na porta ${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth Service: http://localhost:${PORT}/auth`);
  console.log(`🏢 Core Service: http://localhost:${PORT}/api`);
});