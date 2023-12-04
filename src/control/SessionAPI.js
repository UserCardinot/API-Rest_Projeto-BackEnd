const jwt = require('jsonwebtoken')
const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')

//cadastrar
router.post("/cadastrar", async (req, res)=>{
    const { nome, email, senha, dataNasc } = req.body
    const data = new Date(dataNasc)

    res.json(await Usuario.save(nome, email, senha, data))
})

//login
router.post("/login", async (req, res) => {
    let { email, senha } = req.body
    
    const usuario = await Usuario.getByEmail(email, senha)
    if (usuario != null){
        const token = jwt.sign({id: usuario._id}, process.env.SECRET, {expiresIn: '1h'})
        res.json({user: usuario, token: token})
    }
})

module.exports = router