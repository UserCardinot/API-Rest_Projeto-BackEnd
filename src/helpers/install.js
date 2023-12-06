const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { success, fail } = require("../helpers/resposta");

const User = require("../models/usuario").UsuarioModel;
const Curso = require("../models/cursos").CursosModel;
const Exercicio = require("../models/exercicios").ExerciciosModel;
const VideoAula = require("../models/videoaula").VideoAulaModel;

router.get("/", async (req, res) => {
    const nomes = ["Ana", "Bia", "Caio", "Daniel", "Eduardo"];

    const senha = await bcrypt.hash("12345678", 10).catch((err) => {
        res.status(500).json(fail("Erro ao encriptar senha"));
    });
    const senhaAdmin = await bcrypt.hash("admin123", 10).catch((err) => {
        res.status(500).json(fail("Erro ao encriptar senha"));
    });

    let users = [];
    for (let i = 0; i < nomes.length; i++) {
        const user = {
            nome: nomes[i],
            email: nomes[i] + "@email.com",
            senha: senha,
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
        senha: senhaAdmin,
        dataNascimento: new Date("02-02-2000"),
        isAdmin: true,
    });

    await User.insertMany(users)
        .then(function () {
            console.log("Usuarios inseridos com sucesso");
        })
        .catch(function (error) {
            console.log(error);
        });

    const nomesCursos = [
        "Geometria",
        "Álgebra",
        "Funções",
        "Ondulatória",
        "Termodinâmica",
    ];

    cursos = [];
    nomesCursos.forEach((nomeCurso) => {
        const curso = {
            titulo: nomeCurso,
            descricao: "Descrição do curso",
            cargaHoraria: 10,
            categoria: "Exatas",
            dataInicio: new Date("02-02-2023"),
            dataFim: new Date("02-02-2024"),
            url: "https://www.site.com/cursos/" + nomeCurso + "/",
        };

        cursos.push(curso);
    });

    await Curso.insertMany(cursos)
        .then(function () {
            console.log("Cursos inseridos com sucesso");
        })
        .catch(function (error) {
            console.log(error);
        });

    res.status(200).json(
        success(
            "|| Usuários criados com sucesso.|| Senha dos usuários: 12345678 || " +
                "Credenciais de Administrador: " +
                "email: admin@email.com senha: admin123 ||",
            "Observacoes"
        )
    );

    const nomeVideoAula = [
        "Área Euclidiana",
        "Calculo de Interseção",
        "Cálculo de Volume",
        "Função Afim",
        "Função Quadrática",
        "Função Exponencial",
    ];

    const cursoID = [];

    cursoID.push(await Curso.findOne({ titulo: "Geometria" }).lean());
    cursoID.push(await Curso.findOne({ titulo: "Funções" }).lean());

    const check = (i) => {
        if (i < 3) {
            return cursoID[0]._id;
        } else {
            return cursoID[1]._id;
        }
    };

    videoAulas = [];
    for (let i = 0; i < nomeVideoAula.length; i++) {
        const videoAula = {
            titulo: nomeVideoAula[i],
            descricao: "Descrição da videoaula",
            duracao: 10,
            url:
                "https://videos.site.com/videoaulas/" +
                nomeVideoAula[i] +
                ".mp4",
            dataPublicacao: new Date("02-02-2023"),
            curso: check(i),
        };

        videoAulas.push(videoAula);
    }

    await VideoAula.insertMany(videoAulas)
        .then(function () {
            console.log("Videoaulas inseridas com sucesso");
        })
        .catch(function (error) {
            console.log(error);
        });

    const exercicios = [
        {
            titulo: "Calcule o triangulo",
            descricao: "Calcule, base: 10, altura: 10",
            categoria: "Matemática",
            alternativas: ["125", "100", "50", "25", "5"],
            resposta: "50",
            curso: cursoID[0]._id,
        },
        {
            titulo: "Calcule o quadrado",
            descricao: "Calcule, lado: 10",
            categoria: "Matemática",
            alternativas: ["125", "100", "50", "25", "5"],
            resposta: "100",
            curso: cursoID[0]._id,
        },
        {
            titulo: "Calcule o retangulo",
            descricao: "Calcule, base: 25, altura: 10",
            categoria: "Matemática",
            alternativas: ["50", "100", "150", "200", "250"],
            resposta: "250",
            curso: cursoID[0]._id,
        },
        {
            titulo: "Calcule a função afim",
            descricao: "Calcule, f(x) = 2x + 5, para x = 5",
            categoria: "Matemática",
            alternativas: ["5", "10", "15", "20", "25"],
            resposta: "15",
            curso: cursoID[1]._id,
        },
        {
            titulo: "Calcule a função quadrática",
            descricao: "Calcule, f(x) = x² + 5x + 6, para x = 2",
            categoria: "Matemática",
            alternativas: ["10", "15", "20", "25", "30"],
            resposta: "20",
            curso: cursoID[1]._id,
        },
        {
            titulo: "Calcule a função exponencial",
            descricao: "Calcule, f(x) = 2^x, para x = 3",
            categoria: "Matemática",
            alternativas: ["2", "4", "8", "16", "32"],
            resposta: "8",
            curso: cursoID[1]._id,
        },
    ];

    await Exercicio.insertMany(exercicios)
        .then(function () {
            console.log("Exercicios inseridos com sucesso");
        })
        .catch(function (error) {
            console.log(error);
        });
});

router.delete("/", async (req, res) => {
    const collections = mongoose.connection.collections;

    await Promise.all(
        Object.values(collections).map(async (collection) => {
            await collection.deleteMany({});
        })
    );

    res.status(200).json(success("Database limpa com sucesso", "Observacoes"));
});

module.exports = router;
