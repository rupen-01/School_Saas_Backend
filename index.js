import dotenv from "dotenv";
dotenv.config(); // Load default .env
if (process.env.NODE_ENV) {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: true });
}
import path from "path"

import { sequelize } from "./src/config/database.js";
import { app } from "./app.js";
import { loadModelsForSchema } from "./src/utils/schemaLoader.js";
import db from "./src/model/index.js";
import { startScheduledCleanup } from "./src/services/scheduledCleanup.js"; // Add this line

const PORT = Number(process.env.PORT);

(async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected successfully with ${process.env.NODE_ENV}`);

    const commonPath = path.resolve("src/model/common")
    const commonModel =  await loadModelsForSchema(sequelize,"public",commonPath)
    console.log("Loaded Models:", Object.keys(commonModel));
    app.locals.models = {
      ...commonModel,
      ...db
    }
    
    // Make sequelize available to middleware
    app.locals.sequelize = sequelize;

    // Start scheduled cleanup - Add this line
    startScheduledCleanup();

    app.get('/', (req, res) => {
      res.send(`Running in ${process.env.NODE_ENV} with schema ${process.env.SCHOOL_SCHEMA}`);
    });

    app.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${process.env.PORT}`);
      console.log(`Api Documentation available on port http://localhost:${process.env.PORT}/api-docs`);
    });

  } catch (error) {
    console.log("Server not connected", error);
  }
})();