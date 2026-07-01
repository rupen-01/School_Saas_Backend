import express from 'express';
import {
    setupAcademicYearSubjects,
    getAcademicYearSubjects,
    getAvailableSubjectsForAcademicYear,
    deleteAcademicYearSubjects,
    updateAcademicYearSubjects,
    deleteSpecificAcademicYearSubject,
    getSubjectsByClass
} from '../../controller/academicYear/academicYearSubjects.controller.js';
import { verifyJWT } from '../../middleware/auth.js';
import { tenantModelLoader } from '../../middleware/tenantModelLoader.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Apply tenant model loader to all routes
router.use(tenantModelLoader);

// Academic Year Subjects routes
router.route('/:academicYearId/subjects')
    .post(setupAcademicYearSubjects)
    .get(getAcademicYearSubjects)
    .put(updateAcademicYearSubjects)
    .delete(deleteAcademicYearSubjects);

// Available subjects
router.route('/:academicYearId/subjects/available').get(getAvailableSubjectsForAcademicYear);

// Specific subject operations
router.route('/:academicYearId/subjects/:subjectId').delete(deleteSpecificAcademicYearSubject);

// Subjects by class
router.route('/:academicYearId/subjects/class/:classId').get(getSubjectsByClass);

export default router;
