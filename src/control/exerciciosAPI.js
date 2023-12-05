const express = require('express')
const router = express.Router()

const Exercicios = require('../models/exercicios.js')
const auth = require('../helpers/Auth.js')
const {success, fail} = require('../helpers/resposta.js')

//criar um exercicio
router.post('/createExercicio', auth.verificaAdmin, async (req, res) => {
    const {titulo, descricao, categoria, alternativas} = req.body

    if (!Exercicios) {
        return res.status(400).json(fail('Não foi possível criar o curso'))
    }
    res.status(200).json(success(await Exercicios.save(titulo, descricao, categoria, alternativas), "exercicios"))
})

//atualizar um exercicio
router.put('/:id', auth.verificaAdmin, async (req, res) => {
    const {titulo, descricao, categoria, alternativas} = req.body

    //Verifica se o exercicio existe
    let exercicios = await Exercicios.getById(req.params.id)
    if (exercicios == null) return res.status(400).json(fail('Exercicio não encontrado'))

    //verifica se o exercicio ja esta cadastrado
    exercicios = await Exercicios.getByTitulo(titulo)
    if (exercicios != null && exercicios._id != req.params.id) return res.status(400).json(fail('Exercicio já cadastrado'))

    res.status(200).json(success(await Exercicios.update(req.params.id, { titulo, descricao, categoria, alternativas }, "exercicios")))
})

//deletar um exercicio
router.delete('/:id', auth.verificaAdmin, async (req, res) => {

    //verificar se o exercicio existe
    const exercicios = await Exercicios.getById(req.params.id)
    if (exercicios == null) return res.status(400).json(fail('Exercicio não encontrado'))

    res.status(200).json(success(await Exercicios.delete(req.params.id), "exercicios"))
})

//listar exercicios
router.get('/', async (req, res) => {
    res.status(200).json(success(await Exercicios.list(), "exercicios"))
})

//encontrar exercicio por id
router.get('/:id', async (req, res) => {
  
    //verificar se o curso existe
    const exercicios = await Exercicios.getById(req.params.id)
    if (exercicios == null) return res.status(400).json(fail('Exercicio não encontrado'))

    res.status(200).json(success(await Exercicios.getById(req.params.id), "exercicios"))
})

module.exports = router