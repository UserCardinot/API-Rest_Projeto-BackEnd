const mongoose = require("mongoose")

const UsuarioSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String
})

const UsuarioModel = mongoose.model("Usuario", UsuarioSchema)

module.exports = {
    list: async function() {
        const usuarios = await UsuarioModel.find({}).lean()
        return usuarios
    },
    
    save: async function(nome, email, senha) {
        const usuario = new UsuarioModel({
            nome: nome,
            email: email,
            senha: senha
        })
        await usuario.save()
        return usuario
    },

    update: async function(id, obj) {

        let usuario = await UsuarioModel.findById(id)
        if (!usuario) {
            return false
        }
        
        Object.keys(obj).forEach(key => usuario[key] = obj[key])
        await usuario.save()
        return usuario
    },

    delete: async function(id) {
        return await UsuarioModel.findByIdAndDelete(id)
    },

    getById: async function(id) {
        return await UsuarioModel.findById(id).lean()
    }
}