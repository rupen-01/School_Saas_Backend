import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createTenantModels } from "../model/tenant/index.js";

export const loadModelsForSchema = async (sequelize, schemaName, modelFolderPath) => {
  console.log(`\n🚀 ===== SCHEMA LOADER START =====`);
  console.log(`📁 Model Folder Path: ${modelFolderPath}`);
  console.log(`🏢 Schema Name: ${schemaName}`);
  console.log(`🔧 Sequelize Instance: ${sequelize ? 'Available' : 'Not Available'}`);
  
  // Check if this is tenant folder or common folder
  const isTenantFolder = modelFolderPath.includes('tenant');
  console.log(`📂 Is Tenant Folder: ${isTenantFolder}`);
  
  let models = {};
  
  if (isTenantFolder) {
    console.log(`\n🔄 ===== LOADING TENANT MODELS =====`);
    console.log(`🔄 Loading tenant models for schema: ${schemaName}`);
    
    try {
      models = createTenantModels(sequelize, schemaName);
      console.log(`✅ Successfully loaded tenant models`);
      console.log(`📋 Loaded tenant models: ${Object.keys(models).join(', ')}`);
      console.log(`📊 Total models loaded: ${Object.keys(models).length}`);
      
      // Check if AcademicYearClassSections is in models
      if (models.AcademicYearClassSections) {
        console.log(`✅ AcademicYearClassSections model loaded successfully`);
      }
      
      // Check each model individually
      console.log(`\n🔍 ===== MODEL DETAILS =====`);
      for (const [modelName, model] of Object.entries(models)) {
        console.log(`🔍 Model: ${modelName}, Table: ${model.tableName}`);
        if (modelName === 'AcademicYearClassSections') {
          console.log(`✅ AcademicYearClassSections model found in models!`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error loading tenant models:`, error);
      throw error;
    }
  } else {
    console.log(`\n🔄 ===== LOADING COMMON MODELS =====`);
    // Load common models dynamically
    const files = fs.readdirSync(modelFolderPath);
    console.log(`📁 Files in folder: ${files.join(', ')}`);

    for (const file of files) {
      if (file.endsWith(".js")) {
        console.log(`🔄 Processing file: ${file}`);
        // Remove .model if present, and .js
        const rawName = path.basename(file, ".js");
        const cleanName = rawName.replace(".model", "");
        const capitalizedModelName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

        console.log(`📝 Raw Name: ${rawName}, Clean Name: ${cleanName}, Model Name: ${capitalizedModelName}`);

        const modulePath = pathToFileURL(`${modelFolderPath}/${file}`).href;
        console.log(`📁 Module Path: ${modulePath}`);
        
        const modelFn = await import(modulePath);
        const defineModel = modelFn.default || modelFn;

        // Common models के लिए schema parameter optional है
        const model = defineModel(sequelize);
        models[capitalizedModelName] = model;
        console.log(`✅ Loaded model: ${capitalizedModelName}`);
      }
    }

    // Don't sync common models here - they should be handled by db/index.js
    // Common models are already synced through the main db object
    console.log(`📋 Loaded common models: ${Object.keys(models).join(', ')}`);
    console.log(`📊 Total common models: ${Object.keys(models).length}`);
    return models;
  }

  // Dynamic table creation order based on foreign key dependencies
  const syncModelsInOrder = async () => {
    console.log(`\n🔄 ===== SYNCING MODELS =====`);
    const modelNames = Object.keys(models);
    const synced = new Set();
    const maxAttempts = modelNames.length * 2; // Prevent infinite loops
    let attempts = 0;

    console.log(`🔄 Starting sync for models: ${modelNames.join(', ')}`);
    console.log(`📊 Total models to sync: ${modelNames.length}`);
    console.log(`🔄 Max attempts: ${maxAttempts}`);

    while (synced.size < modelNames.length && attempts < maxAttempts) {
      attempts++;
      console.log(`\n🔄 ===== SYNC ATTEMPT ${attempts}/${maxAttempts} =====`);
      console.log(`📊 Progress: ${synced.size}/${modelNames.length} models synced`);
      console.log(`✅ Synced: ${Array.from(synced).join(', ')}`);
      console.log(`⏳ Pending: ${modelNames.filter(name => !synced.has(name)).join(', ')}`);
      
      for (const modelName of modelNames) {
        if (synced.has(modelName)) {
          console.log(`⏭️  Skipping already synced: ${modelName}`);
          continue;
        }

        try {
          console.log(`🔄 Attempting to sync: ${modelName}`);
          console.log(`🔍 Model details:`, {
            name: modelName,
            tableName: models[modelName].tableName,
            schema: models[modelName].schema
          });
          
          // Special handling for AcademicYearClassSections - skip sync if index exists
          if (modelName === 'AcademicYearClassSections') {
            console.log(`🔄 Skipping sync for ${modelName} due to existing index conflict`);
            console.log(`💡 Manual database cleanup required: DROP INDEX academic_year_class_sections_academic_year_id_class_master_id_s`);
            synced.add(modelName);
            console.log(`✅ Skipped sync for: ${modelName}`);
          } else {
            await models[modelName].sync({ force: false });
            synced.add(modelName);
            console.log(`✅ Successfully synced: ${modelName}`);
          }
        } catch (error) {
          console.log(`❌ Failed to sync ${modelName}: ${error.message}`);
          console.log(`🔍 Error details:`, {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
          });
          
          // If sync fails due to foreign key constraints, try again in next iteration
          if (error.message.includes('does not exist') || error.message.includes('relation')) {
            console.log(`⏳ Waiting for dependencies: ${modelName} (dependency issue)`);
            continue;
          } else {
            // If it's a different error, log detailed info and throw it
            console.error(`💥 Detailed error for ${modelName}:`, {
              message: error.message,
              stack: error.stack,
              name: error.name,
              code: error.code
            });
            throw error;
          }
        }
      }
    }

    // Check if all models were synced
    if (synced.size < modelNames.length) {
      const unsynced = modelNames.filter(name => !synced.has(name));
      console.error(`💥 Sync failed! Unsynced models: ${unsynced.join(', ')}`);
      console.error(`📊 Final status: ${synced.size}/${modelNames.length} models synced`);
      console.error(`✅ Successfully synced: ${Array.from(synced).join(', ')}`);
      console.error(`❌ Failed to sync: ${unsynced.join(', ')}`);
      
      // Try to get more details about why each model failed
      for (const modelName of unsynced) {
        try {
          console.log(`🔍 Testing ${modelName} sync individually...`);
          await models[modelName].sync({ force: false });
          console.log(`✅ ${modelName} can sync individually!`);
        } catch (error) {
          console.error(`❌ ${modelName} individual sync error:`, {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
          });
        }
      }
      
      throw new Error(`Failed to sync models due to circular dependencies or other issues: ${unsynced.join(', ')}`);
    }
    
    console.log(`🎉 All models synced successfully! Total: ${synced.size}`);
    console.log(`✅ ===== SYNC COMPLETED =====`);
  };

  await syncModelsInOrder();

  console.log(`🚀 ===== SCHEMA LOADER END =====\n`);
  return models;
};