const mongoose = require("mongoose");

const VideoaulaSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: true,
    },
    descricao: {
        type: String,
        required: true,
    },
    duracao: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    dataPublicacao: {
        type: Date,
        default: Date.now,
    },
    curso: {
        type: String,
        required: true,
    },
});

const VideoAulaModel = mongoose.model("VideoAula", VideoaulaSchema);

module.exports = {
    listByCurso: async function (idCurso, limite, paginacao) {
        const videoAulas = await VideoAulaModel.find({ curso: idCurso })
            .skip(paginacao * limite)
            .limit(limite)
            .lean();
        return videoAulas;
    },

    list: async function (limite, paginacao) {
        const videoAulas = await VideoAulaModel.find({})
            .skip(paginacao * limite)
            .limit(limite)
            .lean();
        return videoAulas;
    },

    save: async function (
        idCurso,
        titulo,
        descricao,
        duracao,
        url,
        dataPublicacao
    ) {
        const videoAula = new VideoAulaModel({
            titulo: titulo,
            descricao: descricao,
            duracao: duracao,
            url: url,
            dataPublicacao: dataPublicacao,
            curso: idCurso,
        });

        await videoAula.save();
        return videoAula;
    },

    update: async function (id, obj) {
        let videoAula = await VideoAulaModel.findById(id);
        if (!videoAula) {
            return false;
        }

        Object.keys(obj).forEach((key) => (videoAula[key] = obj[key]));
        await videoAula.save();
        return videoAula;
    },

    delete: async function (id) {
        return await VideoAulaModel.findByIdAndDelete(id);
    },

    getById: async function (id) {
        const videoAula = await VideoAulaModel.findById(id).lean();
        return videoAula;
    },

    VideoAulaModel,
};
