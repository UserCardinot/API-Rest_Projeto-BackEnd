const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String,
    dataNascimento: Date,
    isAdmin: {
        type: Boolean,
        default: false,
    },
    respostas: [],
});

const UsuarioModel = mongoose.model("Usuario", UsuarioSchema);

module.exports = {
    list: async function (limite, paginacao) {
        const usuarios = await UsuarioModel.find({})
            .skip(paginacao * limite)
            .limit(limite)
            .lean();
        return usuarios;
    },

    save: async function (nome, email, senha, data) {
        const usuario = new UsuarioModel({
            nome: nome,
            email: email,
            senha: senha,
            dataNascimento: data,
        });
        await usuario.save();
        return usuario;
    },

    createAdmin: async function (nome, email, senha, data, isAdmin) {
        const usuario = new UsuarioModel({
            nome: nome,
            email: email,
            senha: senha,
            dataNascimento: data,
            isAdmin: isAdmin,
        });
        await usuario.save();
        return usuario;
    },

    update: async function (id, obj) {
        let usuario = await UsuarioModel.findById(id);
        if (!usuario) {
            return false;
        }

        Object.keys(obj).forEach((key) => (usuario[key] = obj[key]));
        await usuario.save();
        return usuario;
    },

    delete: async function (id) {
        return await UsuarioModel.findByIdAndDelete(id);
    },

    getById: async function (id) {
        return await UsuarioModel.findById(id).lean();
    },

    login: async function (email) {
        const user = await UsuarioModel.findOne({ email: email }).lean();
        if (!user) return null;
        else return user;
    },

    getByEmail: async function (email) {
        return await UsuarioModel.findOne({ email: email }).lean();
    },

    UsuarioModel,
};
