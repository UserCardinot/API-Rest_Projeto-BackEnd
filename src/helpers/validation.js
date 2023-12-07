module.exports =
    (schema, req_type = null) =>
    (req, res, next) => {
        if (req_type === "query") {
            const { error, value } = schema.validate(req.query);
            console.log(req.query.limite);

            if (error) {
                // Validation failed
                return res.status(400).json({
                    status: false,
                    message: error.details[0].message,
                });
            }
        } else if (req_type === "params") {
            const { error, value } = schema.validate(req.params);

            if (error) {
                // Validation failed
                return res.status(400).json({
                    status: false,
                    message: error.details[0].message,
                });
            }
        } else {
            const { error, value } = schema.validate(req.body);
            const dados = req.body;
            let invalidDate = false;

            Object.keys(dados).forEach((key) => {
                if (key.match(/data/gi)) {
                    const data = new Date(dados[key]);

                    if (isNaN(data.getTime())) {
                        invalidDate = true;
                    } else if (data instanceof Date) {
                        req.body[key] = data;
                    }
                }
            });

            if (invalidDate) {
                return res.status(400).json({
                    status: false,
                    message: "Data inválida",
                });
            }

            if (error) {
                // Validation failed
                return res.status(400).json({
                    status: false,
                    message: error.details[0].message,
                });
            }
        }

        next();
    };
