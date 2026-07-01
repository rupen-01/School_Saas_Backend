import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({path:`.env.${process.env.NODE_ENV}`})

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
      },
      options:`endpoint=${process.env.DB_ENDPOINT_ID}`,
      options: "-c search_path=public"
    }
  }
)