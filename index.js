const express = require("express")
const path = require("path")
require("dotenv").config()

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.use(require('./banco/bd'))

const home = require('./control/home')
const RegisterRouter = require('./control/register')
const LoginRouter = require('./control/login')

app.use("/", home)
app.use("/", RegisterRouter)
app.use("/", LoginRouter)

app.listen(process.env.PORT, () => {
    console.log("Running...")
})