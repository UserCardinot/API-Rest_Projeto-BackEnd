const jwt = require('jsonwebtoken')
const Usuario = require('../models/usuario')

module.exports = {
    validarAcesso: (req, res, next) => {
        let beartoken = req.headers['authorization'] || ""
        let token = beartoken.split(' ')[1]
        
        if (!token) {
            return res.status(401).send({ auth: false, message: 'Não foi recebido token.' })
        }
        jwt.verify(token, process.env.SECRET, (err, decoded) => {
            if (err) res.status(500).send({ auth: false, message: 'Falha ao autenticar token.' })
            else {
                req.id = decoded.id
                next()
            }
        })
    },
    verificaAdmin: async (req, res, next) => {
        const usuario = await Usuario.getById(req.id)
        if (usuario.isAdmin) next()
        else res.status(403).send({ auth: false, message: 'Usuário não é administrador.' })
    }
}
