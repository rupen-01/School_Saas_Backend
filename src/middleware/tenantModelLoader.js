import path from "path";
import { loadModelsForSchema } from "../utils/schemaLoader.js";
import { ApiError } from "../utils/apiError.js";

const tenantPath = path.resolve("src/model/tenant");

export const tenantModelLoader = async (req, res, next) => {
    try {
        const userSchema = req.user && req.user.schemaName;
        if (!userSchema) {
            return res.status(400).json({ error: "No schema found for user" });
        }
        const sequelize = req.app.locals.sequelize || req.app.get('sequelize');
        
        req.tenantModels = await loadModelsForSchema(sequelize, userSchema, tenantPath);
        next();
    } catch (err) {
        next(err);
        throw new ApiError(400,err.message)
    }
}; 