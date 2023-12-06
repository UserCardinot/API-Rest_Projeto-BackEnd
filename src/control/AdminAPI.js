const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const Usuario = require("../models/usuario");
const { success, fail } = require("../helpers/resposta");
const validacao = require("../helpers/validation");
const schemas = require("../helpers/joiSchemas");

const verificaAdmin = async (req, res, next) => {
    const user = await Usuario.getById(req.params.id);

    if (user._id == req.id) next();
    else if (user.isAdmin)
        res.status(403).send(fail("Não é possível modificar administradores"));
    else next();
};

//createUser
router.post(
    "/createUser",
    validacao(schemas.cadastroSchema),
    async (req, res) => {
        const { nome, email, senha, dataNasc, isAdmin } = req.body;
        const data = new Date(dataNasc);

        //verificar se o email já existe
        const user = await Usuario.getByEmail(email);
        if (user != null)
            return res.status(400).json(fail("Email já cadastrado"));

        //encriptar a senha
        const salt = await bcrypt.genSalt(process.env.SALT);
        const hashedPassword = await bcrypt.hash(senha, salt).catch((err) => {
            console.log(err);
            return res.status(500).json(fail("Erro ao cadastrar usuário"));
        });

        res.status(200).json(
            success(
                await Usuario.createAdmin(
                    nome,
                    email,
                    hashedPassword,
                    data,
                    isAdmin
                ),
                "user"
            )
        );
    }
);

//updateUser
router.put(
    "/:id",
    verificaAdmin,
    validacao(schemas.cadastroSchema),
    async (req, res) => {
        const { nome, email, senha, dataNasc, isAdmin } = req.body;
        const data = new Date(dataNasc);

        //verificar se o usuário existe
        let user = await Usuario.getById(req.params.id);
        if (user == null)
            return res.status(400).json(fail("Usuário não encontrado"));

        //verificar se o email já existe
        user = await Usuario.getByEmail(email);
        if (user != null && user._id != req.params.id)
            return res.status(400).json(fail("Email já cadastrado"));

        //encriptar a senha
        const salt = await bcrypt.genSalt(process.env.SALT);
        const hashedPassword = await bcrypt.hash(senha, salt).catch((err) => {
            console.log(err);
            return res.status(500).json(fail("Erro ao cadastrar usuário"));
        });

        res.status(200).json(
            success(
                await Usuario.update(
                    req.params.id,
                    { nome, email, hashedPassword, data, isAdmin },
                    "user"
                )
            )
        );
    }
);
//deleteUser
router.delete("/:id", verificaAdmin, async (req, res) => {
    //verificar se o usuário existe
    const user = await Usuario.getById(req.params.id);
    if (user == null)
        return res.status(400).json(fail("Usuário não encontrado"));

    res.status(200).json(success(await Usuario.delete(req.params.id), "user"));
});

//listUsers
router.get("/", async (req, res) => {
    const limite = req.query.limite;
    const paginacao = req.query.paginacao;

    res.status(200).json(
        success(await Usuario.list(limite, paginacao), "users")
    );
});

//findUser
router.get("/:id", async (req, res) => {
    //verificar se o usuário existe
    const user = await Usuario.getById(req.params.id);
    if (user == null)
        return res.status(400).json(fail("Usuário não encontrado"));

    res.status(200).json(success(await Usuario.getById(req.params.id), "user"));
});

module.exports = router;
