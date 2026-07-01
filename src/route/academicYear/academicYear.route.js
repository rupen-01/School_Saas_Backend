import express from "express";
import {
    createAcademicYear,
    getAllAcademicYears,
    getAcademicYearById,
    updateAcademicYear,
    deleteAcademicYear,
    restoreAcademicYear,
    permanentDeleteAcademicYear,
    activateAcademicYear,
    getActiveAcademicYear,
    triggerManualCleanup
} from "../../controller/academicYear/academicYear.controller.js";
import { verifyJWT } from "../../middleware/auth.js";
import { tenantModelLoader } from "../../middleware/tenantModelLoader.js";

const router = express.Router();

// Apply authentication and tenant model loading to all routes
router.use(verifyJWT);
router.use(tenantModelLoader);

// Academic Year Routes (Base routes since app.use("/academic-year") is used)
router.route("/")
    .post(createAcademicYear)           // Create new academic year
    .get(getAllAcademicYears);          // Get all academic years

router.route("/active")
    .get(getActiveAcademicYear);        // Get active academic year

router.route("/:id")
    .get(getAcademicYearById)           // Get academic year by ID
    .put(updateAcademicYear)            // Update academic year
    .delete(deleteAcademicYear);        // Soft delete academic year

router.route("/:id/restore")
    .put(restoreAcademicYear);          // Restore deleted academic year

router.route("/:id/permanent-delete")
    .delete(permanentDeleteAcademicYear); // Permanently delete academic year

router.route("/:id/activate")
    .put(activateAcademicYear);         // Activate academic year

router.route("/cleanup/manual")
    .post(triggerManualCleanup);        // Manual cleanup

export default router;