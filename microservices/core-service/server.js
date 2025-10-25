const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.CORE_PORT || 8082;

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/core-service.log' })
  ]
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/core_service', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Modelos de dados
const empresaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  cnpj: { type: String, required: true, unique: true },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  contato: {
    telefone: String,
    email: String,
    site: String
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const usuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cpf: { type: String, required: true, unique: true },
  dataNascimento: { type: Date, required: true },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  contato: {
    telefone: String,
    celular: String
  },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const funcionarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cpf: { type: String, required: true, unique: true },
  cargo: { type: String, required: true },
  departamento: { type: String, required: true },
  dataAdmissao: { type: Date, required: true },
  salario: { type: Number, required: true },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  contato: {
    telefone: String,
    celular: String
  },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Empresa = mongoose.model('Empresa', empresaSchema);
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Funcionario = mongoose.model('Funcionario', funcionarioSchema);

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

// Middleware de validação
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    service: 'core-service'
  });
});

// ===== ROTAS DE EMPRESA =====

// Listar empresas
app.get('/empresa', async (req, res) => {
  try {
    const empresas = await Empresa.find({ isActive: true })
      .select('-__v')
      .sort({ nome: 1 });

    res.json({ empresas });
  } catch (error) {
    logger.error('Erro ao listar empresas:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar empresa por ID
app.get('/empresa/:id', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);
    
    if (!empresa || !empresa.isActive) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json({ empresa });
  } catch (error) {
    logger.error('Erro ao buscar empresa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar empresa
app.post('/empresa', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('cnpj').isLength({ min: 14, max: 14 }).withMessage('CNPJ deve ter 14 dígitos'),
  body('endereco.cidade').notEmpty().withMessage('Cidade é obrigatória'),
  body('endereco.estado').isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres'),
  body('contato.email').isEmail().withMessage('Email inválido')
], validateRequest, async (req, res) => {
  try {
    const empresa = new Empresa(req.body);
    await empresa.save();

    logger.info(`Nova empresa criada: ${empresa.nome}`);
    res.status(201).json({ empresa });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'CNPJ já cadastrado' });
    }
    logger.error('Erro ao criar empresa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar empresa
app.put('/empresa/:id', [
  body('nome').optional().notEmpty(),
  body('cnpj').optional().isLength({ min: 14, max: 14 }),
  body('contato.email').optional().isEmail()
], validateRequest, async (req, res) => {
  try {
    const empresa = await Empresa.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    logger.info(`Empresa atualizada: ${empresa.nome}`);
    res.json({ empresa });
  } catch (error) {
    logger.error('Erro ao atualizar empresa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar empresa (soft delete)
app.delete('/empresa/:id', async (req, res) => {
  try {
    const empresa = await Empresa.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    logger.info(`Empresa desativada: ${empresa.nome}`);
    res.json({ message: 'Empresa desativada com sucesso' });
  } catch (error) {
    logger.error('Erro ao deletar empresa:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE USUÁRIO =====

// Listar usuários
app.get('/usuario', async (req, res) => {
  try {
    const usuarios = await Usuario.find({ isActive: true })
      .populate('empresa', 'nome cnpj')
      .select('-__v')
      .sort({ nome: 1 });

    res.json({ usuarios });
  } catch (error) {
    logger.error('Erro ao listar usuários:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuário por ID
app.get('/usuario/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .populate('empresa', 'nome cnpj');

    if (!usuario || !usuario.isActive) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    logger.error('Erro ao buscar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar usuário
app.post('/usuario', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('cpf').isLength({ min: 11, max: 11 }).withMessage('CPF deve ter 11 dígitos'),
  body('dataNascimento').isISO8601().withMessage('Data de nascimento inválida'),
  body('empresa').isMongoId().withMessage('ID da empresa inválido')
], validateRequest, async (req, res) => {
  try {
    const usuario = new Usuario(req.body);
    await usuario.save();
    await usuario.populate('empresa', 'nome cnpj');

    logger.info(`Novo usuário criado: ${usuario.nome}`);
    res.status(201).json({ usuario });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    }
    logger.error('Erro ao criar usuário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE FUNCIONÁRIO =====

// Listar funcionários
app.get('/funcionario', async (req, res) => {
  try {
    const funcionarios = await Funcionario.find({ isActive: true })
      .populate('empresa', 'nome cnpj')
      .populate('supervisor', 'nome cargo')
      .select('-__v')
      .sort({ nome: 1 });

    res.json({ funcionarios });
  } catch (error) {
    logger.error('Erro ao listar funcionários:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar funcionário por ID
app.get('/funcionario/:id', async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id)
      .populate('empresa', 'nome cnpj')
      .populate('supervisor', 'nome cargo');

    if (!funcionario || !funcionario.isActive) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json({ funcionario });
  } catch (error) {
    logger.error('Erro ao buscar funcionário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar funcionário
app.post('/funcionario', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('cpf').isLength({ min: 11, max: 11 }).withMessage('CPF deve ter 11 dígitos'),
  body('cargo').notEmpty().withMessage('Cargo é obrigatório'),
  body('departamento').notEmpty().withMessage('Departamento é obrigatório'),
  body('dataAdmissao').isISO8601().withMessage('Data de admissão inválida'),
  body('salario').isNumeric().withMessage('Salário deve ser numérico'),
  body('empresa').isMongoId().withMessage('ID da empresa inválido')
], validateRequest, async (req, res) => {
  try {
    const funcionario = new Funcionario(req.body);
    await funcionario.save();
    await funcionario.populate('empresa', 'nome cnpj');

    logger.info(`Novo funcionário criado: ${funcionario.nome}`);
    res.status(201).json({ funcionario });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    }
    logger.error('Erro ao criar funcionário:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
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
  logger.info(`Core Service iniciado na porta ${PORT}`);
  console.log(`🏢 Core Service rodando na porta ${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🏢 Empresas: http://localhost:${PORT}/empresa`);
  console.log(`👤 Usuários: http://localhost:${PORT}/usuario`);
  console.log(`👷 Funcionários: http://localhost:${PORT}/funcionario`);
});