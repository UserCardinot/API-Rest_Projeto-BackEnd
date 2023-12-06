const express = require("express");
const router = express.Router();

const Usuario = require("../models/usuario");
const Exercicio = require("../models/exercicios");
const { success, fail } = require("../helpers/resposta");

//updateUser
router.put("/", async (req, res) => {
    const { nome, senha, dataNasc } = req.body;
    const data = new Date(dataNasc);

    res.status(200).json(
        success(await Usuario.update(req.id, { nome, senha, data }), "user")
    );
});

//find
router.get("/", async (req, res) => {
    res.status(200).json(success(await Usuario.getById(req.id), "user"));
});

//responder exercício
router.post("/responder", async (req, res) => {
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
    const exRespondido = respostas.find((ex) => ex.exercicio == idExercicio);
    if (exRespondido) {
        const index = respostas.indexOf(exRespondido);
        respostas[index] = respostaObj;
    } else respostas.push(respostaObj);

    await Usuario.update(req.id, { respostas: respostas });

    res.status(200).json(success(respostaObj, "resposta"));
});

module.exports = router;
