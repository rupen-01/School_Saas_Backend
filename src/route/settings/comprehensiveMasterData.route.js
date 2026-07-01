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
    restoreSectionMaster
} from "../../controller/settings/comprehensiveMasterData.controller.js";
import {
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
    restoreHouseMaster,
    // Fee Category Master
    createFeeCategoryMaster,
    getAllFeeCategoryMasters,
    getFeeCategoryMasterById,
    updateFeeCategoryMaster,
    deleteFeeCategoryMaster,
    restoreFeeCategoryMaster
} from "../../controller/settings/masterData.controller.js";
import {
    // Department Master
    createDepartmentMaster,
    getAllDepartmentMasters,
    getDepartmentMasterById,
    updateDepartmentMaster,
    deleteDepartmentMaster,
    restoreDepartmentMaster,
    // Leave Type Master
    createLeaveTypeMaster,
    getAllLeaveTypeMasters,
    getLeaveTypeMasterById,
    updateLeaveTypeMaster,
    deleteLeaveTypeMaster,
    restoreLeaveTypeMaster,
    // Leave Policy Master
    createLeavePolicyMaster,
    getAllLeavePolicyMasters,
    getLeavePolicyMasterById,
    updateLeavePolicyMaster,
    deleteLeavePolicyMaster,
    restoreLeavePolicyMaster
} from "../../controller/settings/staffMasterData.controller.js";
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

// ==================== FEE CATEGORY MASTER ROUTES ====================
router.route("/fee-categories")
    .post(createFeeCategoryMaster)     // Create new fee category master
    .get(getAllFeeCategoryMasters);    // Get all fee category masters

router.route("/fee-categories/:id")
    .get(getFeeCategoryMasterById)     // Get fee category master by ID
    .put(updateFeeCategoryMaster)      // Update fee category master
    .delete(deleteFeeCategoryMaster);  // Soft delete fee category master

router.route("/fee-categories/:id/restore")
    .put(restoreFeeCategoryMaster);    // Restore deleted fee category master

// ==================== DEPARTMENT MASTER ROUTES ====================
router.route("/departments")
    .post(createDepartmentMaster)      // Create new department master
    .get(getAllDepartmentMasters);     // Get all department masters

router.route("/departments/:id")
    .get(getDepartmentMasterById)      // Get department master by ID
    .put(updateDepartmentMaster)       // Update department master
    .delete(deleteDepartmentMaster);   // Soft delete department master

router.route("/departments/:id/restore")
    .put(restoreDepartmentMaster);     // Restore deleted department master

// ==================== LEAVE TYPE MASTER ROUTES ====================
router.route("/leave-types")
    .post(createLeaveTypeMaster)       // Create new leave type master
    .get(getAllLeaveTypeMasters);      // Get all leave type masters

router.route("/leave-types/:id")
    .get(getLeaveTypeMasterById)       // Get leave type master by ID
    .put(updateLeaveTypeMaster)        // Update leave type master
    .delete(deleteLeaveTypeMaster);    // Soft delete leave type master

router.route("/leave-types/:id/restore")
    .put(restoreLeaveTypeMaster);      // Restore deleted leave type master

// ==================== LEAVE POLICY MASTER ROUTES ====================
router.route("/leave-policies")
    .post(createLeavePolicyMaster)     // Create new leave policy master
    .get(getAllLeavePolicyMasters);    // Get all leave policy masters

router.route("/leave-policies/:id")
    .get(getLeavePolicyMasterById)     // Get leave policy master by ID
    .put(updateLeavePolicyMaster)      // Update leave policy master
    .delete(deleteLeavePolicyMaster);  // Soft delete leave policy master

router.route("/leave-policies/:id/restore")
    .put(restoreLeavePolicyMaster);    // Restore deleted leave policy master

export default router;
