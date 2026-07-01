import path from "path";
import { loadModelsForSchema } from "../utils/schemaLoader.js";
import { ApiError } from "../utils/apiError.js";

const tenantPath = path.resolve("src/model/tenant");

export const tenantModelLoader = async (req, res, next) => {
    console.log(`\n🔄 ===== TENANT MODEL LOADER START =====`);
    console.log(`📁 Tenant Path: ${tenantPath}`);
    console.log(`👤 User: ${req.user ? 'Available' : 'Not Available'}`);
    console.log(`🏢 User Schema: ${req.user?.schemaName || 'Not Available'}`);
    console.log(`🔧 Sequelize: ${req.app.locals.sequelize ? 'Available' : 'Not Available'}`);
    
    try {
        const userSchema = req.user && req.user.schemaName;
        if (!userSchema) {
            console.log(`❌ No schema found for user`);
            return res.status(400).json({ error: "No schema found for user" });
        }
        
        console.log(`🔄 Loading models for schema: ${userSchema}`);
        const sequelize = req.app.locals.sequelize || req.app.get('sequelize');
        
        console.log(`🔄 Calling loadModelsForSchema...`);
        req.tenantModels = await loadModelsForSchema(sequelize, userSchema, tenantPath);
        console.log(`✅ Successfully loaded tenant models`);
        console.log(`📋 Available models: ${Object.keys(req.tenantModels).join(', ')}`);
        console.log(`🔄 ===== TENANT MODEL LOADER END =====\n`);
        
        next();
    } catch (err) {
        console.error(`❌ Error in tenantModelLoader:`, err);
        next(err);
        throw new ApiError(400, err.message);
    }
};