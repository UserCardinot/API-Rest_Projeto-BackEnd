const mongoose = require("mongoose")

const ExerciciosSchema = new mongoose.Schema({
    titulo: String,
    descricao: String,
    categoria: String,
    alternativas: String,
})

const ExerciciosModel = mongoose.model("exercicios", ExerciciosSchema)

module.exports = {
    list: async function() {
        const exercicios = await ExerciciosModel.find({}).lean()
        return exercicios
    },

    save: async function(titulo, descricao, categoria, alternativas) {
        const exercicios = new ExerciciosModel({
            titulo: titulo,
            descricao: descricao,
            categoria: categoria,
            alternativas: alternativas,
        })
        await exercicios.save()
        return exercicios
    },

    update: async function(id, obj) {

        let exercicios = await ExerciciosModel.findById(id)
        if (!exercicios) {
            return false
        }
        
        Object.keys(obj).forEach(key => exercicios[key] = obj[key])
        await exercicios.save()
        return exercicios
    },
    
    delete: async function(id) {
        return await ExerciciosModel.findByIdAndDelete(id)
    },

    getById: async function(id) {
        return await ExerciciosModel.findById(id).lean()
    },

    getByTitulo: async function(titulo){
        return await ExerciciosModel.findOne({titulo: titulo}).lean()
    }
}