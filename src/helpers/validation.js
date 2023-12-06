module.exports = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
        // Validation failed
        return res.status(400).json({
            status: false,
            message: error.details[0].message,
        });
    }

    next();
};
