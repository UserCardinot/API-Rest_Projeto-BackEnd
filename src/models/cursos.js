const mongoose = require("mongoose");

const CursosSchema = new mongoose.Schema({
    titulo: String,
    descricao: String,
    cargaHoraria: String,
    categoria: String,
    dataInicio: Date,
    dataFim: Date,
    url: String,
});

const CursosModel = mongoose.model("Curso", CursosSchema);

module.exports = {
    list: async function () {
        const cursos = await CursosModel.find({}).lean();
        return cursos;
    },

    save: async function (
        titulo,
        descricao,
        cargaHoraria,
        categoria,
        dataInicio,
        dataFim,
        url
    ) {
        const cursos = new CursosModel({
            titulo: titulo,
            descricao: descricao,
            cargaHoraria: cargaHoraria,
            categoria: categoria,
            dataInicio: dataInicio,
            dataFim: dataFim,
            url: url,
        });
        await cursos.save();
        return cursos;
    },

    update: async function (id, obj) {
        let cursos = await CursosModel.findById(id);
        if (!cursos) {
            return false;
        }

        Object.keys(obj).forEach((key) => (cursos[key] = obj[key]));
        await cursos.save();
        return cursos;
    },

    delete: async function (id) {
        return await CursosModel.findByIdAndDelete(id);
    },

    getById: async function (id) {
        return await CursosModel.findById(id).lean();
    },

    getByTitulo: async function (titulo) {
        return await CursosModel.findOne({ titulo: titulo }).lean();
    },
    CursosModel,
};
