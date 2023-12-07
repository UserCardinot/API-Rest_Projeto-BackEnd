const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

//Swagger
const swaggerFile = require("./helpers/swagger_output.json");
const swagg = require("swagger-ui-express");

//Helpers
app.use(require("./helpers/bd"));
const auth = require("./helpers/auth.js");
const validacao = require("./helpers/validation.js");
const schemas = require("./helpers/joiSchemas.js");

//Rotas
const sessionRouter = require("./control/SessionAPI");
const adminRouter = require("./control/AdminAPI");
const usersRouter = require("./control/UsersAPI");
const cursosRouter = require("./control/CursosAPI");
const exerciciosRouter = require("./control/ExerciciosAPI.js");
const videoaulasRouter = require("./control/VideoaulasAPI.js");

const installRouter = require("./helpers/install.js");

app.use("/install", installRouter);
app.use("/docs", swagg.serve, swagg.setup(swaggerFile));

app.use("/session", sessionRouter);
app.use("/user", auth.validarAcesso, usersRouter);
app.use("/admin", auth.validarAcesso, auth.verificaAdmin, adminRouter);
app.use("/cursos", auth.validarAcesso, cursosRouter);
app.use(
    "/:idCurso/exercicios",
    validacao(schemas.idCurso, "params"),
    auth.validarAcesso,
    exerciciosRouter
);
app.use(
    "/:idCurso/videoaulas",
    validacao(schemas.idCurso, "params"),
    auth.validarAcesso,
    videoaulasRouter
);

app.get("/*", (req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.listen(process.env.PORT, () => {
    console.log("Listening on port " + process.env.PORT + "...");
});
