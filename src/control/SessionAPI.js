const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();

const Usuario = require("../models/usuario");
const validation = require("../helpers/validation");
const schemas = require("../helpers/joiSchemas");
const { success, fail } = require("../helpers/resposta");

//cadastrar
router.post(
    "/cadastrar",
    validation(schemas.cadastroSchema),
    async (req, res) => {
        const { nome, email, senha, dataNasc } = req.body;
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

        const userInserted = await Usuario.save(
            nome,
            email,
            hashedPassword,
            data
        );

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
    }
);

//login
router.post("/login", validation(schemas.loginSchema), async (req, res) => {
    let { email, senha } = req.body;

    const usuario = await Usuario.login(email, senha);

    if (usuario != null) {
        //verificar se a senha está correta
        const validPass = await bcrypt
            .compare(senha, usuario.senha)
            .catch((err) => {
                console.log(err);
                return res.status(500).json(fail("Erro ao fazer login"));
            });

        if (!validPass) {
            console.log("senha incorreta");
            return res.status(400).json(fail("Email ou senha incorretos"));
        } else {
            const token = jwt.sign({ id: usuario._id }, process.env.SECRET, {
                expiresIn: "1h",
            });
            res.status(200).json(
                success(
                    {
                        usuario: usuario.nome,
                        email: usuario.email,
                        dataNasc: usuario.dataNascimento,
                        token: token,
                    },
                    "user"
                )
            );
        }
    } else return res.status(400).json(fail("Email ou senha incorretos"));
});

module.exports = router;
