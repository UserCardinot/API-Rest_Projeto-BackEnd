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
