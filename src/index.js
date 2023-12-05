const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

//Conexão com o banco de dados e validação de acesso
app.use(require("./helpers/bd"));
const auth = require("./helpers/Auth.js");

//Rotas
const sessionRouter = require("./control/SessionAPI");
const adminRouter = require("./control/AdminAPI");
const usersRouter = require("./control/UsersAPI");
const cursosRouter = require("./control/CursosAPI");
const exerciciosRouter = require("./control/exerciciosAPI.js");
const videoaulasRouter = require("./control/VideoaulasAPI.js");

app.use("/session", sessionRouter);
app.use("/user", auth.validarAcesso, usersRouter);
app.use("/admin", auth.validarAcesso, auth.verificaAdmin, adminRouter);
app.use("/cursos", auth.validarAcesso, cursosRouter);
app.use("/:idCurso/exercicios", auth.validarAcesso, exerciciosRouter);
app.use("/:idCurso/videoaulas", auth.validarAcesso, videoaulasRouter);

app.listen(process.env.PORT, () => {
    console.log("Listening on port " + process.env.PORT + "...");
});
