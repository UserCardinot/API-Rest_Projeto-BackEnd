const Joi = require("@hapi/joi");

const cadastroSchema = Joi.object({
    nome: Joi.string().min(3).max(30).required(),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required(),
    senha: Joi.string().min(8).max(12).alphanum().required(),
    dataNasc: Joi.string().min(10).required(),
    isAdmin: Joi.boolean(),
});

const userSchema = Joi.object({
    nome: Joi.string().min(3).max(30).required(),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required(),
    senha: Joi.string().min(8).max(12).alphanum().required(),
    dataNasc: Joi.string().min(10).required(),
    isAdmin: Joi.boolean(),
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required(),
    senha: Joi.string().min(8).max(12).alphanum().required(),
});

const cursoSchema = Joi.object({
    titulo: Joi.string().min(5).max(50).required(),
    descricao: Joi.string().min(0).max(5000).required(),
    cargaHoraria: Joi.string().min(1).max(30).required(),
    categoria: Joi.string().min(3).max(30).required(),
    dataInicio: Joi.string().min(10).required(),
    dataFim: Joi.string().min(10).required(),
    url: Joi.string().min(3).max(100).required(),
});

const exercicioSchema = Joi.object({
    titulo: Joi.string().min(5).max(50).required(),
    descricao: Joi.string().min(0).max(5000).required(),
    categoria: Joi.string().min(3).max(30).required(),
    alternativas: Joi.array().items(Joi.string().min(3).max(100).required()),
    resposta: Joi.string().min(3).max(100).required(),
});

const videoaulasSchema = Joi.object({
    titulo: Joi.string().min(5).max(50).required(),
    descricao: Joi.string().min(0).max(5000).required(),
    duracao: Joi.string().min(2).max(5).required(),
    url: Joi.string().min(3).max(100).required(),
});

const respostaSchema = Joi.object({
    idExercicio: Joi.string().required(),
    resposta: Joi.string().min(3).max(100).required(),
});

const querySchema = Joi.object({
    limite: Joi.number().integer().valid(0, 5, 10, 30).required(),
    paginacao: Joi.number().integer().min(0).required(),
});

const id = Joi.object({ id: Joi.string().required(), idCurso: Joi.string() });

module.exports = {
    cadastroSchema,
    loginSchema,
    userSchema,
    cursoSchema,
    exercicioSchema,
    videoaulasSchema,
    respostaSchema,
    id,
    idCurso: Joi.object({ idCurso: Joi.string().required() }),
    querySchema,
};
