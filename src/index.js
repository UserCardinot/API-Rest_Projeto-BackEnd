const express = require("express")
const path = require("path")
require("dotenv").config()

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.use(require('./helpers/bd'))

const auth = require('./helpers/Auth.js')

const sessionRouter = require('./control/SessionAPI')
const adminRouter = require('./control/AdminAPI')

//app.use("/", home)
app.use("/session", sessionRouter)
app.use("/admin", auth.validarAcesso, auth.verificaAdmin, adminRouter)

app.listen(process.env.PORT, () => {
    console.log("Running...")
})