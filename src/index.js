const express = require("express")
const path = require("path")
require("dotenv").config()

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

//Conexão com o banco de dados e validação de acesso
app.use(require('./helpers/bd'))
const auth = require('./helpers/Auth.js')

//Rotas
const sessionRouter = require('./control/SessionAPI')
const adminRouter = require('./control/AdminAPI')
const usersRouter = require('./control/UsersAPI')
const cursosRouter = require('./control/CursosAPI')

app.use("/session", sessionRouter)
app.use("/user", auth.validarAcesso, usersRouter)
app.use("/admin", auth.validarAcesso, auth.verificaAdmin, adminRouter)
app.use("/cursos", auth.validarAcesso, cursosRouter)

app.listen(process.env.PORT, () => {
    console.log("Listening on port " + process.env.PORT + "...")
})