import express from 'express';
import {
    setupAcademicYearClassSections,
    getAcademicYearClassSections,
    getAvailableSectionsForAcademicYear,
    deleteAcademicYearClassSections,
    updateAcademicYearClassSections,
    deleteSpecificAcademicYearClassSection,
    getSectionsByClass
} from '../../controller/academicYear/academicYearClassSections.controller.js';
import { verifyJWT } from '../../middleware/auth.js';
import { tenantModelLoader } from '../../middleware/tenantModelLoader.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Apply tenant model loader to all routes
router.use(tenantModelLoader);

// Academic Year Class Sections routes
router.route('/:academicYearId/sections')
    .post(setupAcademicYearClassSections)
    .get(getAcademicYearClassSections)
    .put(updateAcademicYearClassSections)
    .delete(deleteAcademicYearClassSections);

// Get available sections for academic year
router.get('/:academicYearId/sections/available', getAvailableSectionsForAcademicYear);

// Specific section operations
router.route('/:academicYearId/sections/:sectionId').delete(deleteSpecificAcademicYearClassSection);

// Sections by class
router.route('/:academicYearId/sections/class/:classId').get(getSectionsByClass);

export default router;
