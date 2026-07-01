import { Sequelize } from "sequelize";
import { loadModelsForSchema } from "./src/utils/schemaLoader.js";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from the correct file
dotenv.config({ path: '.env.local' });

// Create a simple connection for local development
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  { 
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

const tenantPath = path.resolve("src/model/tenant");

async function syncTenantTables() {
  try {
    console.log("Starting tenant table sync...");
    console.log("Environment variables:", {
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_HOST: process.env.DB_HOST,
      NODE_ENV: process.env.NODE_ENV
    });
    
    // Test connection
    await sequelize.authenticate();
    console.log("Database connection established successfully.");
    
    // Get all schemas from the database, excluding system schemas
    const schemas = await sequelize.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'public', 'pg_toast', 'neon_auth')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`Found ${schemas.length} user schemas:`, schemas.map(s => s.schema_name));
    
    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      console.log(`Syncing tables for schema: ${schemaName}`);
      
      try {
        // Load models for this schema
        const models = await loadModelsForSchema(sequelize, schemaName, tenantPath);
        console.log(`  Loaded models:`, Object.keys(models));
        
        // Sync all models for this schema
        for (const [modelName, model] of Object.entries(models)) {
          try {
            console.log(`  Syncing ${modelName}...`);
            await model.sync({ alter: true });
            console.log(`    ✅ ${modelName} synced successfully`);
          } catch (modelError) {
            console.error(`    ❌ Error syncing ${modelName}:`, modelError.message);
          }
        }
        
        console.log(`✅ Schema ${schemaName} sync completed`);
      } catch (error) {
        console.error(`❌ Error loading models for schema ${schemaName}:`, error.message);
      }
    }
    
    console.log("Tenant table sync completed!");
  } catch (error) {
    console.error("Error during sync:", error);
  } finally {
    await sequelize.close();
  }
}

syncTenantTables();
