const express = require('express')
const router = express.Router()

const Usuario = require('../models/usuario')

router.get("/login", (req, res) => {
    res.end("LOGIN")
})

module.exports = router