const jwt = require('jsonwebtoken')
const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')
const {success, fail} = require('../helpers/resposta')

//cadastrar
router.post("/cadastrar", async (req, res)=>{
    const { nome, email, senha, dataNasc } = req.body
    const data = new Date(dataNasc)

    //verificar email válido
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) return res.status(400).json(fail('Email inválido'))

    //verificar se o email já existe
    const user = await Usuario.getByEmail(email)
    if (user != null) return res.status(400).json(fail('Email já cadastrado'))

    res.status(200).json(success(await Usuario.save(nome, email, senha, data), "user"))
})

//login
router.post("/login", async (req, res) => {
    let { email, senha } = req.body

    //verificar se o email e senha foram enviados
    if (!email || !senha) return res.status(400).json(fail('Email e senha são obrigatórios'))
    
    const usuario = await Usuario.login(email, senha)
    
    if (usuario != null){
        const token = jwt.sign({id: usuario._id}, process.env.SECRET, {expiresIn: '1h'})
        res.status(200).json(success({user: usuario, token: token}, "user"))
    }
    else return res.status(400).json(fail('Email ou senha incorretos'))
})

module.exports = router