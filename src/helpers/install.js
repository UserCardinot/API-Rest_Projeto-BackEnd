const express = require("express");
const router = express.Router();
const User = require("../models/usuario").UsuarioModel;
const mongoose = require("mongoose");
const auth = require("../helpers/auth");

const { success, fail } = require("../helpers/resposta");

router.get("/", async (req, res) => {
    const nomes = ["Ana", "Bia", "Caio", "Daniel", "Eduardo"];

    let users = [];
    for (let i = 0; i < nomes.length; i++) {
        const user = {
            nome: nomes[i],
            email: nomes[i] + "@email.com",
            senha: "12345678",
            dataNascimento: new Date(
                "02-02-" + Math.floor(Math.random() * (2010 - 1990 + 1)) + 1990
            ),
            isAdmin: false,
        };
        users.push(user);
    }

    users.push({
        nome: "Admin",
        email: "admin@email.com",
        senha: "admin",
        dataNascimento: new Date("02-02-2000"),
        isAdmin: true,
    });

    await User.insertMany(users)
        .then(function () {
            console.log("Data inserted");
        })
        .catch(function (error) {
            console.log(error);
        });

    res.status(200).json(success("Usuários criados com sucesso"));
});

router.delete("/", async (req, res) => {
    const collections = mongoose.connection.collections;

    await Promise.all(
        Object.values(collections).map(async (collection) => {
            await collection.deleteMany({});
        })
    );

    res.status(200).json(success("Database limpa com sucesso"));
});

module.exports = router;
