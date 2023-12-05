const mongoose = require("mongoose")

module.exports = (req, res, next) => {
    mongoose.connect(process.env.MONGO_URI).catch((err) => {
        console.log("Error ao conectar no banco...")
    })
    return next()    
}