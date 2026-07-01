import express from 'express';
import {
    setupAcademicYearFeeStructure,
    getAcademicYearFeeStructure,
    getAvailableFeeCategoriesForAcademicYear,
    deleteAcademicYearFeeStructure,
    updateAcademicYearFeeStructure,
    deleteSpecificAcademicYearFeeStructure,
    getFeeStructureByClass
} from '../../controller/academicYear/academicYearFeeStructure.controller.js';
import { verifyJWT } from '../../middleware/auth.js';
import { tenantModelLoader } from '../../middleware/tenantModelLoader.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Apply tenant model loader to all routes
router.use(tenantModelLoader);

// Academic Year Fee Structure routes
router.route('/:academicYearId/fee-structure')
    .post(setupAcademicYearFeeStructure)
    .get(getAcademicYearFeeStructure)
    .put(updateAcademicYearFeeStructure)
    .delete(deleteAcademicYearFeeStructure);

// Available fee categories
router.route('/:academicYearId/fee-structure/available').get(getAvailableFeeCategoriesForAcademicYear);

// Specific fee structure operations
router.route('/:academicYearId/fee-structure/:feeStructureId').delete(deleteSpecificAcademicYearFeeStructure);

// Fee structure by class
router.route('/:academicYearId/fee-structure/class/:classId').get(getFeeStructureByClass);

export default router;
