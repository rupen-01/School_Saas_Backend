import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();
if (process.env.NODE_ENV) {
  dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: true });
}

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  { 
    host:process.env.DB_HOST,
    dialect:"postgres",
    logging:false,
    dialectOptions:{
      ssl:{
        require:true,
        rejectUnauthorized:false
      }
    }
  }
)