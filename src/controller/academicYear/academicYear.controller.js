import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";
import { manualCleanup } from "../../services/scheduledCleanup.js";

// ==================== UTILITY FUNCTIONS ====================

// Proper UUID validation function
const validateUUID = (id, fieldName = "ID") => {
    if (!id || typeof id !== 'string') {
        throw new ApiError(400, `Invalid ${fieldName} format`);
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        throw new ApiError(400, `Invalid ${fieldName} format`);
    }
    
    return true;
};

// Validate academic year label format
const validateAcademicYearLabel = (label) => {
    if (!label?.trim()) {
        throw new ApiError(400, "Academic year label is required");
    }
    
    const labelRegex = /^[0-9]{4}(-[0-9]{4})?$/;
    if (!labelRegex.test(label.trim())) {
        throw new ApiError(400, "Academic year label must be in format 'YYYY' or 'YYYY-YYYY' (e.g., '2025' or '2024-2025')");
    }
    
    return label.trim().toLowerCase();
};

// Validate date format and range
const validateDateRange = (startDate, endDate) => {
    if (!startDate) {
        throw new ApiError(400, "Start date is required");
    }
    if (!endDate) {
        throw new ApiError(400, "End date is required");
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
        throw new ApiError(400, "Invalid start date format");
    }
    if (isNaN(end.getTime())) {
        throw new ApiError(400, "Invalid end date format");
    }
    
    if (start >= end) {
        throw new ApiError(400, "End date must be after start date");
    }
    
    return { start, end };
};

// Validate status enum
const validateStatus = (status) => {
    const validStatuses = ['draft', 'configured', 'active'];
    if (status && !validStatuses.includes(status)) {
        throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }
    return status;
};

// ==================== ACADEMIC YEAR CONTROLLERS ====================

const createAcademicYear = asynchandler(async (req, res) => {
    try {
        const { 
            academic_year_label, 
            start_date, 
            end_date, 
            description,
            status = 'draft',
            is_active = false 
        } = req.body;
        
        const { AcademicYear } = req.tenantModels;

        if (!AcademicYear) {
            throw new ApiError(500, "AcademicYear model not found in tenant models");
        }

        if (!req.user || !req.user.id) {
            throw new ApiError(401, "User authentication required");
        }

        // Validate inputs
        const validatedLabel = validateAcademicYearLabel(academic_year_label);
        validateDateRange(start_date, end_date);
        const validatedStatus = validateStatus(status);

        // Check if academic year with same label exists
        const existingAcademicYear = await AcademicYear.findOne({
            where: {
                academic_year_label: validatedLabel,
                is_deleted: false
            }
        });

        if (existingAcademicYear) {
            throw new ApiError(400, `Academic year '${validatedLabel}' already exists`);
        }

        // If setting as active, ensure only one active academic year
        if (is_active) {
            await AcademicYear.update(
                { 
                    is_active: false,
                    status: 'configured',
                    updated_by: req.user.id
                },
                { 
                    where: { 
                        is_deleted: false,
                        is_active: true 
                    } 
                }
            );
        }

        const academicYear = await AcademicYear.create({
            academic_year_label: validatedLabel,
            start_date,
            end_date,
            description: description?.trim() || null,
            status: is_active ? 'active' : validatedStatus,
            is_active,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.status(201).json(new ApiResponse(201, academicYear, "Academic year created successfully"));
    } catch (error) {
        console.error("Error creating academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while creating academic year: ${error.message}`);
    }
});

const getAllAcademicYears = asynchandler(async (req, res) => {
    try {
        const { AcademicYear } = req.tenantModels;
        const { page = 1, limit = 10, status, is_active } = req.query;

        const whereClause = {
            is_deleted: false
        };

        // Add filters if provided
        if (status) {
            validateStatus(status);
            whereClause.status = status;
        }
        if (is_active !== undefined) {
            whereClause.is_active = is_active === 'true';
        }

        const offset = (page - 1) * limit;

        const { count, rows: academicYears } = await AcademicYear.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json(new ApiResponse(200, {
            academicYears,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, "Academic years retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving academic years:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving academic years: ${error.message}`);
    }
});

// const getAcademicYearById = asynchandler(async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, ClassMaster, SectionMaster } = req.tenantModels;
//         validateUUID(id, "Academic year ID");

//         const academicYear = await AcademicYear.findOne({
//             where: {
//                 id: id,
//                 is_deleted: false
//             },
//             include: [
//                 {
//                     model: AcademicYearClasses,
//                     as: 'classes',
//                     where: { is_deleted: false },
//                     required: false,
//                     include: [
//                         {
//                             model: ClassMaster,
//                             as: 'classMaster',
//                             where: { is_deleted: false },
//                             required: true
//                         }
//                     ]
//                 }
//             ]

//         });
//         const sectionsByClass = await AcademicYearClassSections.findAll({
//             where: {
//                 academic_year_id: id,
//                 is_deleted: false
//             },
//             include: [
//                 {
//                     model: ClassMaster,
//                     as: 'classMaster',
//                     where: { is_deleted: false },
//                     required: true
//                 },
//                 {
//                     model: SectionMaster,
//                     as: 'sectionMaster',
//                     where: { is_deleted: false },
//                     required: true
//                 }
//             ]
//         });
        
//         // Group sections by class
//         const groupedSections = sectionsByClass.reduce((acc, item) => {
//             const classId = item.classMaster.id;
//             if (!acc[classId]) {
//                 acc[classId] = {
//                     class_id: classId,
//                     class_name: item.classMaster.class_name,
//                     class_code: item.classMaster.class_code,
//                     sections: []
//                 };
//             }
//             acc[classId].sections.push({
//                 id: item.id,
//                 section_master_id: item.sectionMaster.id,
//                 section_name: item.sectionMaster.section_name,
//                 section_code: item.sectionMaster.section_code
//             });
//             return acc;
//         }, {});
        
//         // Add sections_by_class to response
//         academicYear.dataValues.sections_by_class = Object.values(groupedSections);
        

//         if (!academicYear) {
//             throw new ApiError(404, "Academic year not found");
//         }

//         res.status(200).json(new ApiResponse(200, academicYear, "Academic year retrieved successfully"));
//     } catch (error) {
//         console.error("Error retrieving academic year:", error);
//         if (error instanceof ApiError) {
//             throw error;
//         }
//         throw new ApiError(500, `Internal server error while retrieving academic year: ${error.message}`);
//     }
// });


const getAcademicYearById = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, AcademicYearSubjects, AcademicYearFeeStructure, ClassMaster, SectionMaster, SubjectMaster, FeeCategoryMaster } = req.tenantModels;
        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: false
            },
            include: [
                {
                    model: AcademicYearClasses,
                    as: 'classes',
                    where: { is_deleted: false },
                    required: false,
                    include: [
                        {
                            model: ClassMaster,
                            as: 'classMaster',
                            where: { is_deleted: false },
                            required: true
                        }
                    ]
                }
            ]
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Create a mapping from class_master_id to AcademicYearClasses.id
        const classMasterIdToAcademicYearClassId = {};
        if (academicYear.classes && academicYear.classes.length > 0) {
            academicYear.classes.forEach(academicYearClass => {
                classMasterIdToAcademicYearClassId[academicYearClass.class_master_id] = academicYearClass.id;
            });
        }

        // Get sections by class
        const sectionsByClass = await AcademicYearClassSections.findAll({
            where: {
                academic_year_id: id,
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
                    model: SectionMaster,
                    as: 'sectionMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });
        
        // Get subjects by class
        const subjectsByClass = await AcademicYearSubjects.findAll({
            where: {
                academic_year_id: id,
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
            ]
        });

        // Get fee structure by class
        const feeStructureByClass = await AcademicYearFeeStructure.findAll({
            where: {
                academic_year_id: id,
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
                    model: FeeCategoryMaster,
                    as: 'feeCategory',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });


        
        // Group sections by class
        const groupedSections = sectionsByClass.reduce((acc, item) => {
            const classMasterId = item.class_master_id;
            const academicYearClassId = classMasterIdToAcademicYearClassId[classMasterId];
            
            // Use class_master_id as key for grouping
            if (!acc[classMasterId]) {
                acc[classMasterId] = {
                    class_id: academicYearClassId || null,
                    class_master_id: classMasterId,
                    class_name: item.classMaster.class_name,
                    class_code: item.classMaster.class_code,
                    sections: []
                };
            }
            acc[classMasterId].sections.push({
                id: item.id,
                section_master_id: item.sectionMaster.id,
                section_name: item.sectionMaster.section_name,
                section_code: item.sectionMaster.section_code
            });
            return acc;
        }, {});

        // Group subjects by class
        const groupedSubjects = subjectsByClass.reduce((acc, item) => {
            const classMasterId = item.class_master_id;
            const academicYearClassId = classMasterIdToAcademicYearClassId[classMasterId];
            
            // Use class_master_id as key for grouping
            if (!acc[classMasterId]) {
                acc[classMasterId] = {
                    class_id: academicYearClassId || null,
                    class_master_id: classMasterId,
                    class_name: item.classMaster.class_name,
                    class_code: item.classMaster.class_code,
                    subjects: []
                };
            }
            acc[classMasterId].subjects.push({
                id: item.id,
                subject_master_id: item.subjectMaster.id,
                subject_name: item.subjectMaster.subject_name,
                subject_code: item.subjectMaster.subject_code
            });
            return acc;
        }, {});

        // Group fee structure by class
        const groupedFeeStructure = feeStructureByClass.reduce((acc, item) => {
            const classMasterId = item.class_master_id;
            const academicYearClassId = classMasterIdToAcademicYearClassId[classMasterId];
            
            // Use class_master_id as key for grouping
            if (!acc[classMasterId]) {
                acc[classMasterId] = {
                    class_id: academicYearClassId || null,
                    class_master_id: classMasterId,
                    class_name: item.classMaster.class_name,
                    class_code: item.classMaster.class_code,
                    fees: []
                };
            }
            acc[classMasterId].fees.push({
                id: item.id,
                fee_category_id: item.fee_category_id,
                category_name: item.feeCategory.category_name,
                category_type: item.feeCategory.category_type,
                total_amount: item.total_amount,
                due_date: item.due_date,
                installment_type: item.installment_type,
                installment_count: item.installment_count,
                is_mandatory: item.is_mandatory,
                description: item.description
            });
            return acc;
        }, {});


        // Convert to plain object and apply transformations
        const academicYearData = academicYear.toJSON();

        // Transform classes to simplified structure
        if (academicYearData.classes) {
            academicYearData.classes = academicYearData.classes.map(classItem => ({
                id: classItem.id,
                class_master_id: classItem.class_master_id,
                class_name: classItem.classMaster.class_name,
                class_code: classItem.classMaster.class_code
            }));
        }

        // Add sections_by_class, subjects_by_class, and fee_structure_by_class to response
        academicYearData.sections_by_class = Object.values(groupedSections);
        academicYearData.subjects_by_class = Object.values(groupedSubjects);
        academicYearData.fee_structure_by_class = Object.values(groupedFeeStructure);

        res.status(200).json(new ApiResponse(200, academicYearData, "Academic year retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving academic year: ${error.message}`);
    }
});


const updateAcademicYear = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { academic_year_label, start_date, end_date, description, status } = req.body;
        const { AcademicYear } = req.tenantModels;

        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Validate inputs if provided
        let validatedLabel = academicYear.academic_year_label;
        if (academic_year_label) {
            validatedLabel = validateAcademicYearLabel(academic_year_label);
            
            // Check if new label conflicts with existing
            if (validatedLabel !== academicYear.academic_year_label) {
                const existingAcademicYear = await AcademicYear.findOne({
                    where: {
                        academic_year_label: validatedLabel,
                        is_deleted: false,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingAcademicYear) {
                    throw new ApiError(400, `Academic year '${validatedLabel}' already exists`);
                }
            }
        }

        if (start_date && end_date) {
            validateDateRange(start_date, end_date);
        }

        const validatedStatus = validateStatus(status);

        await academicYear.update({
            academic_year_label: validatedLabel,
            start_date: start_date || academicYear.start_date,
            end_date: end_date || academicYear.end_date,
            description: description?.trim() || academicYear.description,
            status: validatedStatus || academicYear.status,
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, academicYear, "Academic year updated successfully"));
    } catch (error) {
        console.error("Error updating academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while updating academic year: ${error.message}`);
    }
});

const deleteAcademicYear = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, AcademicYearSubjects, AcademicYearFeeStructure } = req.tenantModels;

        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Check if academic year is active
        if (academicYear.is_active) {
            throw new ApiError(400, "Cannot delete active academic year. Please activate another academic year first.");
        }

        // Get sequelize instance for transaction
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Soft delete all related configurations
            const deletedConfigurations = [];

            // Delete classes
            const classesCount = await AcademicYearClasses.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (classesCount > 0) {
                await AcademicYearClasses.update(
                    {
                        is_deleted: true,
                        updated_by: req.user.id
                    },
                    {
                        where: {
                            academic_year_id: id,
                            is_deleted: false
                        },
                        transaction
                    }
                );
                deletedConfigurations.push(`${classesCount} class(es)`);
            }

            // Delete sections
            const sectionsCount = await AcademicYearClassSections.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (sectionsCount > 0) {
                await AcademicYearClassSections.update(
                    {
                        is_deleted: true,
                        updated_by: req.user.id
                    },
                    {
                        where: {
                            academic_year_id: id,
                            is_deleted: false
                        },
                        transaction
                    }
                );
                deletedConfigurations.push(`${sectionsCount} section(s)`);
            }

            // Delete subjects
            const subjectsCount = await AcademicYearSubjects.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (subjectsCount > 0) {
                await AcademicYearSubjects.update(
                    {
                        is_deleted: true,
                        updated_by: req.user.id
                    },
                    {
                        where: {
                            academic_year_id: id,
                            is_deleted: false
                        },
                        transaction
                    }
                );
                deletedConfigurations.push(`${subjectsCount} subject(s)`);
            }

            // Delete fee structure
            const feeStructureCount = await AcademicYearFeeStructure.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (feeStructureCount > 0) {
                await AcademicYearFeeStructure.update(
                    {
                        is_deleted: true,
                        updated_by: req.user.id
                    },
                    {
                        where: {
                            academic_year_id: id,
                            is_deleted: false
                        },
                        transaction
                    }
                );
                deletedConfigurations.push(`${feeStructureCount} fee structure(s)`);
            }

            // Soft delete the academic year
            await academicYear.update({
                is_deleted: true,
                updated_by: req.user.id
            }, { transaction });

            // Commit transaction
            await transaction.commit();

            // Prepare response message
            let message = "Academic year deleted successfully";
            if (deletedConfigurations.length > 0) {
                message += ` along with ${deletedConfigurations.join(', ')}`;
            }

            res.status(200).json(new ApiResponse(200, null, message));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error deleting academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting academic year: ${error.message}`);
    }
});

const restoreAcademicYear = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { AcademicYear } = req.tenantModels;

        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: true
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Deleted academic year not found");
        }

        // Check if 90 days have passed
        const restorePeriodDays = parseInt(process.env.ACADEMIC_YEAR_RESTORE_PERIOD_DAYS) || 90;
        const daysSinceDeletion = Math.floor((new Date() - new Date(academicYear.deleted_at)) / (1000 * 60 * 60 * 24));

        if (daysSinceDeletion > restorePeriodDays) {
            throw new ApiError(400, `Cannot restore academic year. ${restorePeriodDays} days have passed since deletion.`);
        }

        // Simple restore without transaction
        console.log(`Attempting to restore academic year: ${academicYear.academic_year_label}`);
        
        await academicYear.update({
            is_deleted: false,
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, null, "Academic year restored successfully"));
    } catch (error) {
        console.error("Error restoring academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while restoring academic year: ${error.message}`);
    }
});

const permanentDeleteAcademicYear = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, AcademicYearSubjects, AcademicYearFeeStructure } = req.tenantModels;

        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Check if academic year is active
        if (academicYear.is_active) {
            throw new ApiError(400, "Cannot permanently delete active academic year. Please activate another academic year first.");
        }

        // Get sequelize instance for transaction
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Count related configurations for reporting
            const deletedConfigurations = [];

            // Permanently delete classes
            const classesCount = await AcademicYearClasses.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (classesCount > 0) {
                await AcademicYearClasses.destroy({
                    where: {
                        academic_year_id: id,
                        is_deleted: false
                    },
                    transaction
                });
                deletedConfigurations.push(`${classesCount} class(es)`);
            }

            // Permanently delete sections
            const sectionsCount = await AcademicYearClassSections.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (sectionsCount > 0) {
                await AcademicYearClassSections.destroy({
                    where: {
                        academic_year_id: id,
                        is_deleted: false
                    },
                    transaction
                });
                deletedConfigurations.push(`${sectionsCount} section(s)`);
            }

            // Permanently delete subjects
            const subjectsCount = await AcademicYearSubjects.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (subjectsCount > 0) {
                await AcademicYearSubjects.destroy({
                    where: {
                        academic_year_id: id,
                        is_deleted: false
                    },
                    transaction
                });
                deletedConfigurations.push(`${subjectsCount} subject(s)`);
            }

            // Permanently delete fee structure
            const feeStructureCount = await AcademicYearFeeStructure.count({ 
                where: { 
                    academic_year_id: id, 
                    is_deleted: false 
                } 
            });

            if (feeStructureCount > 0) {
                await AcademicYearFeeStructure.destroy({
                    where: {
                        academic_year_id: id,
                        is_deleted: false
                    },
                    transaction
                });
                deletedConfigurations.push(`${feeStructureCount} fee structure(s)`);
            }

            // Permanently delete the academic year
            await AcademicYear.destroy({
                where: {
                    id: id
                },
                transaction
            });

            // Commit transaction
            await transaction.commit();

            // Prepare response message
            let message = "Academic year permanently deleted successfully";
            if (deletedConfigurations.length > 0) {
                message += ` along with ${deletedConfigurations.join(', ')}`;
            }

            res.status(200).json(new ApiResponse(200, null, message));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error permanently deleting academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while permanently deleting academic year: ${error.message}`);
    }
});

const activateAcademicYear = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { AcademicYear, AcademicYearClasses } = req.tenantModels;

        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Check if already active
        if (academicYear.is_active) {
            throw new ApiError(400, "Academic year is already active");
        }

        // Check if configuration is complete
        const classesCount = await AcademicYearClasses.count({ 
            where: { 
                academic_year_id: id, 
                is_deleted: false 
            } 
        });

        if (classesCount === 0) {
            throw new ApiError(400, "Cannot activate academic year. Missing configuration: classes");
        }

        // Deactivate all other academic years
        await AcademicYear.update(
            { 
                is_active: false,
                status: 'configured',
                updated_by: req.user.id
            },
            { 
                where: { 
                    is_deleted: false,
                    is_active: true 
                } 
            }
        );

        // Activate this academic year
        await academicYear.update({
            is_active: true,
            status: 'active',
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, academicYear, "Academic year activated successfully"));
    } catch (error) {
        console.error("Error activating academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while activating academic year: ${error.message}`);
    }
});

const getActiveAcademicYear = asynchandler(async (req, res) => {
    try {
        const { AcademicYear } = req.tenantModels;

        const activeAcademicYear = await AcademicYear.findOne({
            where: {
                is_active: true,
                is_deleted: false
            }
        });

        if (!activeAcademicYear) {
            throw new ApiError(404, "No active academic year found");
        }

        res.status(200).json(new ApiResponse(200, activeAcademicYear, "Active academic year retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving active academic year:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving active academic year: ${error.message}`);
    }
});

const getAcademicYearConfigurationProgress = asynchandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, AcademicYearSubjects, AcademicYearFeeStructure } = req.tenantModels;

        validateUUID(id, "Academic year ID");

        const academicYear = await AcademicYear.findOne({
            where: {
                id: id,
                is_deleted: false
            }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Check configuration progress
        const classesCount = await AcademicYearClasses.count({ 
            where: { 
                academic_year_id: id, 
                is_deleted: false 
            } 
        });

        const sectionsCount = await AcademicYearClassSections.count({ 
            where: { 
                academic_year_id: id, 
                is_deleted: false 
            } 
        });

        const subjectsCount = await AcademicYearSubjects.count({ 
            where: { 
                academic_year_id: id, 
                is_deleted: false 
            } 
        });

        const feeStructureCount = await AcademicYearFeeStructure.count({ 
            where: { 
                academic_year_id: id, 
                is_deleted: false 
            } 
        });

        const configurationProgress = {
            classes: classesCount > 0,
            sections: sectionsCount > 0,
            subjects: subjectsCount > 0,
            fee_structure: feeStructureCount > 0,
            total_steps: 4,
            completed_steps: (classesCount > 0 ? 1 : 0) + (sectionsCount > 0 ? 1 : 0) + (subjectsCount > 0 ? 1 : 0) + (feeStructureCount > 0 ? 1 : 0)
        };

        const isReadyForActivation = configurationProgress.completed_steps >= 1; // At least classes configured

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            configuration_progress: configurationProgress,
            is_ready_for_activation: isReadyForActivation,
            status: academicYear.status
        }, "Configuration progress retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving configuration progress:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving configuration progress: ${error.message}`);
    }
});

const triggerManualCleanup = asynchandler(async (req, res) => {
    try {
        console.log('Manual cleanup triggered by admin');
        await manualCleanup();
        
        res.status(200).json(new ApiResponse(200, null, "Manual cleanup completed successfully"));
    } catch (error) {
        console.error("Error during manual cleanup:", error);
        throw new ApiError(500, "Internal server error during manual cleanup");
    }
});

export {
    createAcademicYear,
    getAllAcademicYears,
    getAcademicYearById,
    updateAcademicYear,
    deleteAcademicYear,
    restoreAcademicYear,
    permanentDeleteAcademicYear,
    activateAcademicYear,
    getActiveAcademicYear,
    getAcademicYearConfigurationProgress,
    triggerManualCleanup
};