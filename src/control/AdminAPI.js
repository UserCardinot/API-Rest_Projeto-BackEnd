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
router.put("/:id", async (req, res) => {
    const { nome, email, senha, dataNasc, isAdmin } = req.body
    const data = new Date(dataNasc)
    res.json(await Usuario.update(req.params.id, { nome, email, senha, data, isAdmin }))
})
//deleteUser
router.delete("/:id", async (req, res) => {
    res.json(await Usuario.delete(req.params.id))
})

//listUsers
router.get("/", async (req, res) => {
    res.json(await Usuario.list())
})
//findUser
router.get("/:id", async (req, res) => {
    res.json(await Usuario.getById(req.params.id))
})

module.exports = router