export const pagination = (model, includeOptions = [], attributes = null) => {
    return async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 30;
            const offset = (page - 1) * limit;

            const findOptions = {
                offset,
                limit,
            };

            if (attributes) {
                findOptions.attributes = attributes;
            }

            if (includeOptions.length > 0) {
                findOptions.include = includeOptions;
            }

            const { count, rows } = await model.findAndCountAll(findOptions);

            res.paginatedResults = {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                data: rows,
            };

            next();
        } catch (err) {
            res.status(500).json({ message: "Pagination error", error: err.message });
        }
    };
}; 