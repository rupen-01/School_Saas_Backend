import express, { urlencoded } from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import dotenv from "dotenv"
import helmet from "helmet";

const app = express()

dotenv.config({path:`.env.${process.env.NODE_ENV}`})

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cors({
    origin:process.env.CORS,
    credentials:true
}))
app.use(cookieParser())
app.use(helmet({
    crossOriginResourcePolicy:{policy:"cross-origin"}
}))
app.use(express.static("public"))
app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
}, express.static("uploads"));

// super admin routes
import superAdminRoute from "./src/route/superAdmin.route.js"
app.use("/admin",superAdminRoute)

// module routes
import moduleRoute from "./src/route/module.route.js"
app.use("/module", moduleRoute)

// plan routes
import planRoute from "./src/route/plan.route.js"
app.use("/plan", planRoute)

// school routes
import schoolRoute from "./src/route/school.route.js"
app.use("/school", schoolRoute)

// settings routes (only for other settings, not academic year)
import settingsRoutes from "./src/route/settings/index.js"
app.use("/settings", settingsRoutes)

// academic year routes
import academicYearRoutes from "./src/route/academicYear/academicYear.route.js"
app.use("/academic-year", academicYearRoutes)

// academic year classes routes
import academicYearClassesRoutes from "./src/route/academicYear/academicYearClasses.route.js"
app.use("/academic-year", academicYearClassesRoutes)

// academic year class sections routes
import academicYearClassSectionsRoutes from "./src/route/academicYear/academicYearClassSections.route.js"
app.use("/academic-year", academicYearClassSectionsRoutes)

// academic year subjects routes
import academicYearSubjectsRoutes from "./src/route/academicYear/academicYearSubjects.route.js"
app.use("/academic-year", academicYearSubjectsRoutes)

// academic year fee structure routes
import academicYearFeeStructureRoutes from "./src/route/academicYear/academicYearFeeStructure.route.js"
app.use("/academic-year", academicYearFeeStructureRoutes)

import { setupSwagger } from "./src/utils/swaggerConfig.js";
setupSwagger(app)

export {app}