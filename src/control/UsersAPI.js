const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')
const {success, fail} = require('../helpers/resposta')

//updateUser
router.put("/", async (req, res) => {
    const { nome, senha, dataNasc} = req.body
    const data = new Date(dataNasc)

    res.status(200).json(success(await Usuario.update(req.id, { nome, senha, data }, "user")))
})

//find
router.get("/", async (req, res) => {
    res.status(200).json(success(await Usuario.getById(req.id), "user"))
})

module.exports = router