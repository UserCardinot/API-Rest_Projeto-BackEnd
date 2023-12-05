const express = require('express')
const router = express.Router()

const Cursos = require('../models/cursos')
const auth = require('../helpers/Auth.js')
const {success, fail} = require('../helpers/resposta')

//criar um curso
router.post('/createCurso', auth.verificaAdmin, async (req, res) => {
    const {titulo, descricao, cargaHoraria, categoria, dataInicio, dataFim, url} = req.body
    const dataInicioCurso = new Date(dataInicio)
    const dataFimCurso = new Date(dataFim)

    if (!Cursos) {
        return res.status(400).json(fail('Não foi possível criar o curso'))
    }
    res.status(200).json(success(await Cursos.save(titulo, descricao, cargaHoraria, categoria, dataInicioCurso, dataFimCurso, url), "cursos"))
})

//atualizar um curso
router.put('/:id', auth.verificaAdmin, async (req, res) => {
    const {titulo, descricao, cargaHoraria, categoria, dataInicio, dataFim, url} = req.body
    const dataInicioCurso = new Date(dataInicio)
    const dataFimCurso = new Date(dataFim)

    //Verifica se o curso existe
    let curso = await Cursos.getById(req.params.id)
    if (curso == null) return res.status(400).json(fail('Curso não encontrado'))

    //verifica se o curso ja esta cadastrado
    curso = await Cursos.getByTitulo(titulo)
    if (curso != null && curso._id != req.params.id) return res.status(400).json(fail('Curso já cadastrado'))

    res.status(200).json(success(await Cursos.update(req.params.id, { titulo, descricao, cargaHoraria, categoria, dataInicioCurso, dataFimCurso, url }, "cursos")))
})

//deletar um curso
router.delete('/:id', auth.verificaAdmin, async (req, res) => {
    //verificar se o curso existe
    const cursos = await Cursos.getById(req.params.id)
    if (cursos == null) return res.status(400).json(fail('Curso não encontrado'))

    res.status(200).json(success(await Cursos.delete(req.params.id), "cursos"))
})

//listar cursos
router.get('/', async (req, res) => {
    res.status(200).json(success(await Cursos.list(), "cursos"))
})

//encontrar cursos
router.get('/:id', async (req, res) => {
  
    //verificar se o curso existe
    const cursos = await Cursos.getById(req.params.id)
    if (cursos == null) return res.status(400).json(fail('Curso não encontrado'))

    res.status(200).json(success(await Cursos.getById(req.params.id), "cursos"))
})

module.exports = router