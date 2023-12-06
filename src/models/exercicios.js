const mongoose = require("mongoose");

const ExerciciosSchema = new mongoose.Schema({
    titulo: String,
    descricao: String,
    categoria: String,
    alternativas: [String],
    resposta: {
        type: String,
        required: true,
    },
    curso: {
        type: String,
        required: true,
    },
});

const ExerciciosModel = mongoose.model("Exercicios", ExerciciosSchema);

module.exports = {
    listByCurso: async function (idCurso, limite, paginacao) {
        const exercicios = await ExerciciosModel.find({ curso: idCurso })
            .skip(paginacao)
            .limit(limite)
            .lean();
        return exercicios;
    },
    list: async function (limite, paginacao) {
        const exercicios = await ExerciciosModel.find({}).lean();
        return exercicios.slice(paginacao, limite);
    },
    save: async function (
        titulo,
        descricao,
        categoria,
        alternativas,
        resposta,
        idCurso
    ) {
        const exercicios = new ExerciciosModel({
            titulo: titulo,
            descricao: descricao,
            categoria: categoria,
            alternativas: alternativas,
            resposta: resposta,
            curso: idCurso,
        });
        await exercicios.save();
        return exercicios;
    },

    update: async function (id, obj) {
        let exercicios = await ExerciciosModel.findById(id);
        if (!exercicios) {
            return false;
        }

        Object.keys(obj).forEach((key) => (exercicios[key] = obj[key]));
        await exercicios.save();
        return exercicios;
    },

    delete: async function (id) {
        return await ExerciciosModel.findByIdAndDelete(id);
    },

    getById: async function (id) {
        return await ExerciciosModel.findById(id).lean();
    },

    ExerciciosModel,
};
