import express from 'express';
import {
    setupAcademicYearClasses,
    getAcademicYearClasses,
    getAvailableClasses,
    deleteAcademicYearClasses,
    deleteSpecificAcademicYearClass,
    updateAcademicYearClasses
} from '../../controller/academicYear/academicYearClasses.controller.js';
import { verifyJWT } from '../../middleware/auth.js';
import { tenantModelLoader } from '../../middleware/tenantModelLoader.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Apply tenant model loader to all routes
router.use(tenantModelLoader);

// Academic Year Classes Routes (Base routes since app.use("/academic-year") is used)
router.route("/:academicYearId/classes")
    .post(setupAcademicYearClasses)           // Setup classes for academic year
    .get(getAcademicYearClasses)              // Get classes for academic year
    .put(updateAcademicYearClasses)           // Update/Replace classes for academic year
    .delete(deleteAcademicYearClasses);       // Delete all classes from academic year

router.route("/:academicYearId/classes/available")
    .get(getAvailableClasses);                // Get available classes with selection status

router.route("/:academicYearId/classes/:classId")
    .delete(deleteSpecificAcademicYearClass); // Delete specific class from academic year

export default router;