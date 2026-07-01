import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== ACADEMIC YEAR SUBJECTS CONTROLLERS ====================

const setupAcademicYearSubjects = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { selected_subjects } = req.body;
        const { AcademicYear, AcademicYearClasses, AcademicYearSubjects, ClassMaster, SubjectMaster } = req.tenantModels;

        console.log('=== SETUP ACADEMIC YEAR SUBJECTS DEBUG ===');
        console.log('academicYearId:', academicYearId);
        console.log('selected_subjects:', selected_subjects);

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: {
                id: academicYearId,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        console.log('Academic year found:', academicYear.id);

        // Get selected classes for this academic year
        const selectedClasses = await AcademicYearClasses.findAll({
            where: {
                academic_year_id: academicYear.id,
                is_deleted: false
            },
            include: [
                {
                    model: ClassMaster,
                    as: 'classMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });

        const selectedClassIds = selectedClasses.map(cls => cls.class_master_id);
        console.log('Selected classes for academic year:', selectedClassIds);

        // Validate selected_subjects array
        if (!selected_subjects || !Array.isArray(selected_subjects)) {
            throw new ApiError(400, "selected_subjects array is required");
        }

        if (selected_subjects.length === 0) {
            throw new ApiError(400, "At least one class-subject combination must be provided");
        }

        // Validate that all class_ids are from selected classes
        const providedClassIds = selected_subjects.map(item => item.class_id);
        const invalidClassIds = providedClassIds.filter(classId => !selectedClassIds.includes(classId));
        
        if (invalidClassIds.length > 0) {
            throw new ApiError(400, `Invalid class IDs: ${invalidClassIds.join(', ')}. Only classes selected for this academic year are allowed.`);
        }

        // Validate subjects for each class
        for (const classSubject of selected_subjects) {
            const { class_id, subject_ids } = classSubject;
            
            if (!subject_ids || !Array.isArray(subject_ids) || subject_ids.length === 0) {
                throw new ApiError(400, `Subject IDs are required for class ${class_id}`);
            }

            // Validate that subjects exist
            const subjects = await SubjectMaster.findAll({
                where: {
                    id: subject_ids,
                    is_deleted: false
                }
            });

            if (subjects.length !== subject_ids.length) {
                throw new ApiError(400, `One or more subject IDs are invalid for class ${class_id}`);
            }
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year subjects (soft delete)
            await AcademicYearSubjects.update(
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                    updated_by: req.user.id
                },
                {
                    where: {
                        academic_year_id: academicYear.id,
                        is_deleted: false
                    },
                    transaction
                }
            );

            // Create new academic year subjects
            const academicYearSubjects = [];
            for (const classSubject of selected_subjects) {
                const { class_id, subject_ids } = classSubject;
                
                for (const subject_id of subject_ids) {
                    const academicYearSubject = await AcademicYearSubjects.create({
                        academic_year_id: academicYear.id,
                        class_master_id: class_id,
                        subject_master_id: subject_id,
                        created_by: req.user.id,
                        updated_by: req.user.id
                    }, { transaction });
                    
                    academicYearSubjects.push(academicYearSubject);
                }
            }

            // Commit transaction
            await transaction.commit();

            console.log('Academic year subjects created successfully:', academicYearSubjects.length);

            res.status(201).json(new ApiResponse(201, academicYearSubjects, `Subjects setup successfully for academic year ${academicYear.academic_year_label}`));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error setting up academic year subjects:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while setting up academic year subjects: ${error.message}`);
    }
});

const getAcademicYearSubjects = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearSubjects, ClassMaster, SubjectMaster } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: {
                id: academicYearId,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Get academic year subjects with related data
        const academicYearSubjects = await AcademicYearSubjects.findAll({
            where: {
                academic_year_id: academicYear.id,
                is_deleted: false
            },
            include: [
                {
                    model: ClassMaster,
                    as: 'classMaster',
                    where: { is_deleted: false },
                    required: true
                },
                {
                    model: SubjectMaster,
                    as: 'subjectMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ],
            order: [
                ['classMaster', 'class_name', 'ASC'],
                ['subjectMaster', 'subject_name', 'ASC']
            ]
        });

        // Group subjects by class
        const subjectsByClass = {};
        academicYearSubjects.forEach(item => {
            const classId = item.class_master_id;
            if (!subjectsByClass[classId]) {
                subjectsByClass[classId] = {
                    class_id: classId,
                    class_name: item.classMaster.class_name,
                    subjects: []
                };
            }
            subjectsByClass[classId].subjects.push({
                subject_id: item.subject_master_id,
                subject_name: item.subjectMaster.subject_name
            });
        });

        const groupedSubjects = Object.values(subjectsByClass);

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            subjects_by_class: groupedSubjects,
            total_subjects: academicYearSubjects.length
        }, "Academic year subjects retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving academic year subjects:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving academic year subjects: ${error.message}`);
    }
});

const getAvailableSubjectsForAcademicYear = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClasses, ClassMaster, SubjectMaster } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: {
                id: academicYearId,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Get selected classes for this academic year
        const selectedClasses = await AcademicYearClasses.findAll({
            where: {
                academic_year_id: academicYear.id,
                is_deleted: false
            },
            include: [
                {
                    model: ClassMaster,
                    as: 'classMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });

        if (selectedClasses.length === 0) {
            throw new ApiError(400, "No classes selected for this academic year. Please select classes first.");
        }

        const selectedClassIds = selectedClasses.map(cls => cls.class_master_id);

        // Get all subjects
        const availableSubjects = await SubjectMaster.findAll({
            where: {
                is_deleted: false
            },
            order: [
                ['subject_name', 'ASC']
            ]
        });

        // Group subjects by class (all subjects are available for all classes)
        const subjectsByClass = {};
        selectedClasses.forEach(classItem => {
            const classId = classItem.class_master_id;
            subjectsByClass[classId] = {
                class_id: classId,
                class_name: classItem.classMaster.class_name,
                subjects: availableSubjects.map(subject => ({
                    subject_id: subject.id,
                    subject_name: subject.subject_name
                }))
            };
        });

        const groupedSubjects = Object.values(subjectsByClass);

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            available_subjects_by_class: groupedSubjects,
            total_available_subjects: availableSubjects.length
        }, "Available subjects for academic year retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving available subjects:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving available subjects: ${error.message}`);
    }
});

const deleteAcademicYearSubjects = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearSubjects } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: {
                id: academicYearId,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Soft delete all academic year subjects
        await AcademicYearSubjects.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: req.user.id
            },
            {
                where: {
                    academic_year_id: academicYear.id,
                    is_deleted: false
                }
            }
        );

        res.status(200).json(new ApiResponse(200, null, "Academic year subjects deleted successfully"));
    } catch (error) {
        console.error("Error deleting academic year subjects:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting academic year subjects: ${error.message}`);
    }
});

const updateAcademicYearSubjects = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { selected_subjects } = req.body;
        const { AcademicYear, AcademicYearClasses, AcademicYearSubjects, ClassMaster, SubjectMaster } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: {
                id: academicYearId,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Get selected classes for this academic year
        const selectedClasses = await AcademicYearClasses.findAll({
            where: {
                academic_year_id: academicYear.id,
                is_deleted: false
            }
        });

        const selectedClassIds = selectedClasses.map(cls => cls.class_master_id);

        // Validate selected_subjects array
        if (!selected_subjects || !Array.isArray(selected_subjects)) {
            throw new ApiError(400, "selected_subjects array is required");
        }

        // Validate that all class_ids are from selected classes
        const providedClassIds = selected_subjects.map(item => item.class_id);
        const invalidClassIds = providedClassIds.filter(classId => !selectedClassIds.includes(classId));
        
        if (invalidClassIds.length > 0) {
            throw new ApiError(400, `Invalid class IDs: ${invalidClassIds.join(', ')}. Only classes selected for this academic year are allowed.`);
        }

        // Validate subjects for each class
        for (const classSubject of selected_subjects) {
            const { class_id, subject_ids } = classSubject;
            
            if (!subject_ids || !Array.isArray(subject_ids) || subject_ids.length === 0) {
                throw new ApiError(400, `Subject IDs are required for class ${class_id}`);
            }

            // Validate that subjects exist
            const subjects = await SubjectMaster.findAll({
                where: {
                    id: subject_ids,
                    is_deleted: false
                }
            });

            if (subjects.length !== subject_ids.length) {
                throw new ApiError(400, `One or more subject IDs are invalid for class ${class_id}`);
            }
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year subjects (soft delete)
            await AcademicYearSubjects.update(
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                    updated_by: req.user.id
                },
                {
                    where: {
                        academic_year_id: academicYear.id,
                        is_deleted: false
                    },
                    transaction
                }
            );

            // Create new academic year subjects
            const academicYearSubjects = [];
            for (const classSubject of selected_subjects) {
                const { class_id, subject_ids } = classSubject;
                
                for (const subject_id of subject_ids) {
                    const academicYearSubject = await AcademicYearSubjects.create({
                        academic_year_id: academicYear.id,
                        class_master_id: class_id,
                        subject_master_id: subject_id,
                        created_by: req.user.id,
                        updated_by: req.user.id
                    }, { transaction });
                    
                    academicYearSubjects.push(academicYearSubject);
                }
            }

            // Commit transaction
            await transaction.commit();

            res.status(200).json(new ApiResponse(200, academicYearSubjects, "Academic year subjects updated successfully"));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error updating academic year subjects:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while updating academic year subjects: ${error.message}`);
    }
});

const deleteSpecificAcademicYearSubject = asynchandler(async (req, res) => {
    try {
        const { academicYearId, subjectId } = req.params;
        const { AcademicYear, AcademicYearSubjects } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: { id: academicYearId, is_deleted: false }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Soft delete specific subject
        const [updatedRows] = await AcademicYearSubjects.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: req.user.id
            },
            {
                where: {
                    id: subjectId,
                    academic_year_id: academicYearId,
                    is_deleted: false
                }
            }
        );

        if (updatedRows === 0) {
            throw new ApiError(404, "Subject not found for this academic year");
        }

        res.status(200).json(new ApiResponse(200, null, "Subject deleted successfully from academic year"));
    } catch (error) {
        console.error("Error deleting specific subject:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting subject: ${error.message}`);
    }
});

const getSubjectsByClass = asynchandler(async (req, res) => {
    try {
        const { academicYearId, classId } = req.params;
        const { AcademicYear, AcademicYearSubjects, ClassMaster, SubjectMaster } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: { id: academicYearId, is_deleted: false }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Get subjects for specific class
        const subjects = await AcademicYearSubjects.findAll({
            where: {
                academic_year_id: academicYearId,
                class_master_id: classId,
                is_deleted: false
            },
            include: [
                {
                    model: SubjectMaster,
                    as: 'subjectMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });

        res.status(200).json(new ApiResponse(200, subjects, "Subjects for class retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving subjects by class:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving subjects: ${error.message}`);
    }
});

export {
    setupAcademicYearSubjects,
    getAcademicYearSubjects,
    getAvailableSubjectsForAcademicYear,
    deleteAcademicYearSubjects,
    updateAcademicYearSubjects,
    deleteSpecificAcademicYearSubject,
    getSubjectsByClass
};
