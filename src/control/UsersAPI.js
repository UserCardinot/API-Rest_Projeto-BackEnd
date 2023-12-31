const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const Usuario = require("../models/usuario");
const Exercicio = require("../models/exercicios");
const Curso = require("../models/cursos");
const { success, fail } = require("../helpers/resposta");

const validacao = require("../helpers/validation");
const schemas = require("../helpers/joiSchemas");

//updateUser
router.put("/", validacao(schemas.userSchema), async (req, res) => {
    const { nome, email, senha, dataNasc } = req.body;
    const data = new Date(dataNasc);

    //verificar se o email já existe
    const user = await Usuario.getByEmail(email);
    if (user != null) return res.status(400).json(fail("Email já cadastrado"));

    //encriptar a senha
    const salt = await bcrypt.genSalt(process.env.SALT);
    const hashedPassword = await bcrypt.hash(senha, salt).catch((err) => {
        console.log(err);
        return res.status(500).json(fail("Erro ao cadastrar usuário"));
    });

    const userInserted = await Usuario.update(req.id, {
        nome,
        email,
        hashedPassword,
        data,
    });

    res.status(200).json(
        success(
            {
                nome: userInserted.nome,
                email: userInserted.email,
                dataNascimento: userInserted.dataNascimento,
            },
            "user"
        )
    );
});

//retorna o usuário
router.get("/", async (req, res) => {
    const user = await Usuario.getById(req.id);

    res.status(200).json(
        success(
            {
                nome: user.nome,
                email: user.email,
                dataNascimento: user.dataNascimento,
            },
            "user"
        )
    );
});

//responder exercício
router.post(
    "/responder",
    validacao(schemas.respostaSchema),
    async (req, res) => {
        const { idExercicio, resposta } = req.body;

        //verifica se o exercício existe
        const exercicio = await Exercicio.getById(idExercicio);
        if (exercicio == null)
            return res.status(400).json(fail("Exercicio não encontrado"));

        //verifica se a resposta é válida
        const alternativas = exercicio.alternativas;
        if (!alternativas.includes(resposta))
            return res.status(400).json(fail("Alternativa inválida"));

        const user = await Usuario.getById(req.id);
        const respostas = user.respostas;
        const status = exercicio.resposta == resposta ? "correta" : "incorreta";

        const respostaObj = {
            exercicio: idExercicio,
            status: status,
            resposta: resposta,
            data: new Date(),
        };

        //verifica se o usuário já respondeu o exercício
        const exRespondido = respostas.find(
            (ex) => ex.exercicio == idExercicio
        );
        if (exRespondido) {
            const index = respostas.indexOf(exRespondido);
            respostas[index] = respostaObj;
        } else respostas.push(respostaObj);

        await Usuario.update(req.id, { respostas: respostas });

        res.status(200).json(success(respostaObj, "resposta"));
    }
);

//Porcentagem de acertos por curso
router.get("/acertos", async (req, res) => {
    const user = await Usuario.getById(req.id);
    const respostas = user.respostas;
    const listaExercicios = await Exercicio.list();
    const listaCursos = await Curso.list();

    //fazer uma lista de cursos
    const cursos = [];
    listaCursos.forEach((curso) => {
        const c = {
            idCurso: curso._id.toString(),
            titulo: curso.titulo,
        };
        cursos.push(c);
    });

    //para cada curso, fazer uma lista de exercícios
    cursos.forEach((curso) => {
        curso.exercicios = listaExercicios.filter(
            (ex) => ex.curso == curso.idCurso
        );
    });

    //para cada curso, fazer a quantidade de acertos da lista de exercícios
    cursos.forEach((curso) => {
        curso.acertos = 0;
        curso.total = curso.exercicios.length;
        curso.exercicios.forEach((exercicio) => {
            const ex = respostas.find(
                (resposta) => resposta.exercicio == exercicio._id.toString()
            );
            if (ex) {
                if (ex.status == "correta") curso.acertos++;
            }
        });
    });

    //por fim, fazer a porcentagem de acertos de cada curso
    const acertos = cursos.map((curso) => {
        const acertos = (curso.acertos / curso.total) * 100;

        return {
            curso: curso.idCurso,
            titulo: curso.titulo,
            acertos: acertos.toFixed(3),
        };
    });

    res.status(200).json(success(acertos, "resultados"));
});

module.exports = router;
