const express = require("express");
const router = express.Router({ mergeParams: true });

const Exercicios = require("../models/exercicios.js");
const auth = require("../helpers/auth.js");
const { success, fail } = require("../helpers/resposta.js");

const schemas = require("../helpers/joiSchemas.js");
const validation = require("../helpers/validation.js");

//criar um exercicio
router.post(
    "/",
    auth.verificaAdmin,
    validation(schemas.exercicioSchema),
    async (req, res) => {
        const { titulo, descricao, categoria, alternativas, resposta } =
            req.body;

        //verifica se a resposta é válida
        if (!alternativas.includes(resposta))
            return res.status(400).json(fail("A resposta não é válida"));

        res.status(200).json(
            success(
                await Exercicios.save(
                    titulo,
                    descricao,
                    categoria,
                    alternativas,
                    resposta,
                    req.params.idCurso
                ),
                "exercicios"
            )
        );
    }
);

//atualizar um exercicio
router.put(
    "/:id",
    auth.verificaAdmin,
    validation(schemas.exercicioSchema),
    async (req, res) => {
        const { titulo, descricao, categoria, alternativas, resposta } =
            req.body;

        //Verifica se o exercicio existe
        let exercicios = await Exercicios.getById(req.params.id);
        if (exercicios == null)
            return res.status(400).json(fail("Exercicio não encontrado"));

        res.status(200).json(
            success(
                await Exercicios.update(
                    req.params.id,
                    { titulo, descricao, categoria, alternativas, resposta },
                    "exercicios"
                )
            )
        );
    }
);

//deletar um exercicio
router.delete("/:id", auth.verificaAdmin, async (req, res) => {
    //verificar se o exercicio existe
    const exercicios = await Exercicios.getById(req.params.id);
    if (exercicios == null)
        return res.status(400).json(fail("Exercicio não encontrado"));

    res.status(200).json(
        success(await Exercicios.delete(req.params.id), "exercicios")
    );
});

router.get("/all", async (req, res) => {
    const limite = req.query.limite;
    const paginacao = req.query.paginacao;

    res.status(200).json(
        success(await Exercicios.list(limite, paginacao), "exercicios")
    );
});

//listar exercicios
router.get("/", async (req, res) => {
    const limite = req.query.limite;
    const paginacao = req.query.paginacao;

    res.status(200).json(
        success(
            await Exercicios.listByCurso(req.params.idCurso, limite, paginacao),
            "exercicios"
        )
    );
});

//encontrar exercicio por id
router.get("/:id", async (req, res) => {
    //verificar se o exercicio existe
    const exercicios = await Exercicios.getById(req.params.id);
    if (exercicios == null)
        return res.status(400).json(fail("Exercicio não encontrado"));

    res.status(200).json(
        success(await Exercicios.getById(req.params.id), "exercicios")
    );
});

module.exports = router;
