const express = require("express");
const router = express.Router({ mergeParams: true });

const VideoAula = require("../models/videoaula.js");
const auth = require("../helpers/Auth.js");
const { success, fail } = require("../helpers/resposta.js");

//criar uma videoaula
router.post("/", auth.verificaAdmin, async (req, res) => {
    const { titulo, descricao, duracao, url } = req.body;

    if (!VideoAula) {
        return res.status(400).json(fail("Não foi possível criar a videoaula"));
    }
    console.log(req.params.id);
    res.status(200).json(
        success(
            await VideoAula.save(
                req.params.idCurso,
                titulo,
                descricao,
                duracao,
                url
            ),
            "videoaula"
        )
    );
});

//atualizar uma videoaula
router.put("/:id", auth.verificaAdmin, async (req, res) => {
    const { titulo, descricao, duracao, url, dataPublicacao } = req.body;

    //Verifica se a videoaula existe
    let videoAula = await VideoAula.getById(req.params.id);
    if (videoAula == null)
        return res.status(400).json(fail("Videoaula não encontrada"));

    res.status(200).json(
        success(
            await VideoAula.update(
                req.params.id,
                { titulo, descricao, duracao, url, dataPublicacao },
                "videoaula"
            )
        )
    );
});

//deletar uma videoaula
router.delete("/:id", auth.verificaAdmin, async (req, res) => {
    //verificar se a videoaula existe
    const videoAula = await VideoAula.getById(req.params.id);
    if (videoAula == null)
        return res.status(400).json(fail("Videoaula não encontrada"));

    res.status(200).json(
        success(await VideoAula.delete(req.params.id), "videoaula")
    );
});

//listar todas videoaulas
router.get("/all", auth.verificaAdmin, async (req, res) => {
    const limite = req.query.limite;
    const paginacao = req.query.paginacao;

    res.status(200).json(
        success(await VideoAula.list(limite, paginacao), "videoaulas")
    );
});

//listar videoaulas por curso
router.get("/", auth.verificaAdmin, async (req, res) => {
    const limite = req.query.limite;
    const paginacao = req.query.paginacao;

    res.status(200).json(
        success(
            await VideoAula.listByCurso(req.params.idCurso, limite, paginacao),
            "videoaulas"
        )
    );
});

module.exports = router;
