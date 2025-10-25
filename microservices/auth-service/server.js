const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.AUTH_PORT || 8081;

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/auth-service.log' })
  ]
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_service', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Modelo de Usuário
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'hr', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login
  message: 'Muitas tentativas de login, tente novamente em 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// Middleware de validação
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Geração de tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

// Registro de usuário
app.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('role').optional().isIn(['admin', 'manager', 'hr', 'user'])
], validateRequest, async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    // Verificar se usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const user = new User({
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`Novo usuário registrado: ${email}`);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Erro no registro:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`Login realizado: ${email}`);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Erro no login:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
app.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário inválido' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Erro na verificação do token:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Refresh token
app.post('/refresh', [
  body('refreshToken').notEmpty()
], validateRequest, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Token de refresh inválido' });
    }

    const { accessToken } = generateTokens(user);

    res.json({
      accessToken
    });

  } catch (error) {
    logger.error('Erro no refresh token:', error.message);
    res.status(401).json({ error: 'Token de refresh inválido' });
  }
});

// Logout
app.post('/logout', async (req, res) => {
  // Em uma implementação real, você adicionaria o token a uma blacklist
  res.json({ message: 'Logout realizado com sucesso' });
});

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
      ip: req.ip
    });
  });
  
  next();
});

app.listen(PORT, () => {
  logger.info(`Auth Service iniciado na porta ${PORT}`);
  console.log(`🔐 Auth Service rodando na porta ${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔑 Login: http://localhost:${PORT}/login`);
  console.log(`📝 Register: http://localhost:${PORT}/register`);
});