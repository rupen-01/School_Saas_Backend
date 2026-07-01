import express from "express";
import {
    // Class Master
    createClassMaster,
    getAllClassMasters,
    getClassMasterById,
    updateClassMaster,
    deleteClassMaster,
    restoreClassMaster,
    
    // Section Master
    createSectionMaster,
    getAllSectionMasters,
    getSectionMasterById,
    updateSectionMaster,
    deleteSectionMaster,
    restoreSectionMaster,
    
    // Subject Master
    createSubjectMaster,
    getAllSubjectMasters,
    getSubjectMasterById,
    updateSubjectMaster,
    deleteSubjectMaster,
    restoreSubjectMaster,
    
    // House Master
    createHouseMaster,
    getAllHouseMasters,
    getHouseMasterById,
    updateHouseMaster,
    deleteHouseMaster,
    restoreHouseMaster
} from "../../controller/settings/masterData.controller.js";
import { verifyJWT } from "../../middleware/auth.js";
import { tenantModelLoader } from "../../middleware/tenantModelLoader.js";

const router = express.Router();

// Apply authentication and tenant model loading to all routes
router.use(verifyJWT);
router.use(tenantModelLoader);

// ==================== CLASS MASTER ROUTES ====================
router.route("/classes")
    .post(createClassMaster)           // Create new class master
    .get(getAllClassMasters);          // Get all class masters

router.route("/classes/:id")
    .get(getClassMasterById)           // Get class master by ID
    .put(updateClassMaster)            // Update class master
    .delete(deleteClassMaster);        // Soft delete class master

router.route("/classes/:id/restore")
    .put(restoreClassMaster);          // Restore deleted class master

// ==================== SECTION MASTER ROUTES ====================
router.route("/sections")
    .post(createSectionMaster)         // Create new section master
    .get(getAllSectionMasters);        // Get all section masters

router.route("/sections/:id")
    .get(getSectionMasterById)         // Get section master by ID
    .put(updateSectionMaster)          // Update section master
    .delete(deleteSectionMaster);      // Soft delete section master

router.route("/sections/:id/restore")
    .put(restoreSectionMaster);        // Restore deleted section master

// ==================== SUBJECT MASTER ROUTES ====================
router.route("/subjects")
    .post(createSubjectMaster)         // Create new subject master
    .get(getAllSubjectMasters);        // Get all subject masters

router.route("/subjects/:id")
    .get(getSubjectMasterById)         // Get subject master by ID
    .put(updateSubjectMaster)          // Update subject master
    .delete(deleteSubjectMaster);      // Soft delete subject master

router.route("/subjects/:id/restore")
    .put(restoreSubjectMaster);        // Restore deleted subject master

// ==================== HOUSE MASTER ROUTES ====================
router.route("/houses")
    .post(createHouseMaster)           // Create new house master
    .get(getAllHouseMasters);          // Get all house masters

router.route("/houses/:id")
    .get(getHouseMasterById)           // Get house master by ID
    .put(updateHouseMaster)            // Update house master
    .delete(deleteHouseMaster);        // Soft delete house master

router.route("/houses/:id/restore")
    .put(restoreHouseMaster);          // Restore deleted house master

export default router;
