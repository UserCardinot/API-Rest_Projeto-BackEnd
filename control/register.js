const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')

router.get("/register", (req, res) => {
    res.end("REGISTER")
})

module.exports = router