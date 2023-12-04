const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')

//createUser
router.post("/createUser", async (req, res) => {
    const { nome, email, senha, dataNasc, isAdmin } = req.body
    const data = new Date(dataNasc)
    res.json(await Usuario.createAdmin(nome, email, senha, data, isAdmin))
})

//updateUser
//deleteUser
//listUsers

router.get("/", async (req, res) => {
    res.json(await Usuario.list())
})
//findUser

module.exports = router