module.exports = {
    success: (obj, name) => {
        let resp = {status: true}
        if (name) resp[name] = obj
        else resp.obj = obj

        return resp
    },
    fail: (message) => {
        return {status: false, message: message}
    }
}