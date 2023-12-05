const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')
const {success, fail} = require('../helpers/resposta')

const verificaAdmin = async (req, res, next) => {
    const user = await Usuario.getById(req.params.id)

    if (user._id == req.id) next()
    else if (user.isAdmin) res.status(403).send(fail('Não é possível modificar administradores'))
    else next()
}

//createUser
router.post("/createUser", async (req, res) => {
    const { nome, email, senha, dataNasc, isAdmin} = req.body
    const data = new Date(dataNasc)

    //verificar se o email já existe
    const user = await Usuario.getByEmail(email)
    if (user != null) return res.status(400).json(fail('Email já cadastrado'))

    res.status(200).json(success(await Usuario.createAdmin(nome, email, senha, data, isAdmin), "user"))
})

//updateUser
router.put("/:id", verificaAdmin, async (req, res) => {
    const { nome, email, senha, dataNasc, isAdmin } = req.body
    const data = new Date(dataNasc)

    //verificar se o usuário existe
    let user = await Usuario.getById(req.params.id)
    if (user == null) return res.status(400).json(fail('Usuário não encontrado'))

    //verificar se o email já existe
    user = await Usuario.getByEmail(email)
    if (user != null && user._id != req.params.id) return res.status(400).json(fail('Email já cadastrado'))

    res.status(200).json(success(await Usuario.update(req.params.id, { nome, email, senha, data, isAdmin }, "user")))
})
//deleteUser
router.delete("/:id", verificaAdmin, async (req, res) => {

    //verificar se o usuário existe
    const user = await Usuario.getById(req.params.id)
    if (user == null) return res.status(400).json(fail('Usuário não encontrado'))

    res.status(200).json(success(await Usuario.delete(req.params.id), "user"))
})

//listUsers
router.get("/", async (req, res) => {
    res.status(200).json(success(await Usuario.list(), "users"))
})
//findUser
router.get("/:id", async (req, res) => {

    //verificar se o usuário existe
    const user = await Usuario.getById(req.params.id)
    if (user == null) return res.status(400).json(fail('Usuário não encontrado'))

    res.status(200).json(success(await Usuario.getById(req.params.id), "user"))
})

module.exports = router