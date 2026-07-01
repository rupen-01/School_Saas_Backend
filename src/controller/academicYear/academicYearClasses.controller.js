import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== ACADEMIC YEAR CLASSES CONTROLLERS ====================

const setupAcademicYearClasses = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { selected_classes } = req.body;
        const { AcademicYear, AcademicYearClasses, ClassMaster } = req.tenantModels;

        console.log('=== SETUP ACADEMIC YEAR CLASSES DEBUG ===');
        console.log('academicYearId:', academicYearId);
        console.log('selected_classes:', selected_classes);

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

        // Validate selected_classes array
        if (!selected_classes || !Array.isArray(selected_classes)) {
            throw new ApiError(400, "selected_classes array is required");
        }

        if (selected_classes.length === 0) {
            throw new ApiError(400, "At least one class must be selected");
        }

        // Validate class IDs exist
        const classIds = selected_classes.map(item => item.class_id);
        const classes = await ClassMaster.findAll({
            where: {
                id: classIds,
                is_deleted: false
            }
        });

        if (classes.length !== classIds.length) {
            throw new ApiError(400, "One or more class IDs are invalid");
        }

        console.log('Valid classes found:', classes.length);

        // Get sequelize instance from the first model
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year classes (soft delete)
            await AcademicYearClasses.update(
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

            // Create new academic year classes
            const academicYearClasses = [];
            for (const classItem of selected_classes) {
                const academicYearClass = await AcademicYearClasses.create({
                    academic_year_id: academicYear.id,
                    class_master_id: classItem.class_id,
                    created_by: req.user.id,
                    updated_by: req.user.id
                }, { transaction });
                
                academicYearClasses.push(academicYearClass);
            }

            // Commit transaction
            await transaction.commit();

            console.log('Academic year classes created successfully:', academicYearClasses.length);

            res.status(201).json(new ApiResponse(201, academicYearClasses, `Classes setup successfully for academic year ${academicYear.academic_year_label}`));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error setting up academic year classes:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while setting up academic year classes: ${error.message}`);
    }
});

const getAcademicYearClasses = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClasses, ClassMaster } = req.tenantModels;

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

        // Get academic year classes with class details
        const academicYearClasses = await AcademicYearClasses.findAll({
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

        res.status(200).json(new ApiResponse(200, academicYearClasses, "Academic year classes retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving academic year classes:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving academic year classes: ${error.message}`);
    }
});

const getAvailableClasses = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClasses, ClassMaster } = req.tenantModels;

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

        // Get all classes that are not already assigned to this academic year
        const assignedClassIds = await AcademicYearClasses.findAll({
            where: {
                academic_year_id: academicYear.id,
                is_deleted: false
            },
            attributes: ['class_master_id']
        });

        const assignedIds = assignedClassIds.map(item => item.class_master_id);

        const availableClasses = await ClassMaster.findAll({
            where: {
                id: { [Op.notIn]: assignedIds },
                is_deleted: false
            },
            order: [['class_name', 'ASC']]
        });

        res.status(200).json(new ApiResponse(200, availableClasses, "Available classes retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving available classes:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving available classes: ${error.message}`);
    }
});

const deleteAcademicYearClasses = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClasses } = req.tenantModels;

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

        // Soft delete all classes for this academic year
        await AcademicYearClasses.update(
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

        res.status(200).json(new ApiResponse(200, null, "All classes removed from academic year successfully"));
    } catch (error) {
        console.error("Error deleting academic year classes:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting academic year classes: ${error.message}`);
    }
});

const deleteSpecificAcademicYearClass = asynchandler(async (req, res) => {
    try {
        const { academicYearId, classId } = req.params;
        const { AcademicYear, AcademicYearClasses } = req.tenantModels;

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

        // Find and soft delete specific class
        const academicYearClass = await AcademicYearClasses.findOne({
            where: {
                academic_year_id: academicYear.id,
                class_master_id: classId,
                is_deleted: false
            }
        });

        if (!academicYearClass) {
            throw new ApiError(404, "Class not found in this academic year");
        }

        await academicYearClass.update({
            is_deleted: true,
            deleted_at: new Date(),
            updated_by: req.user.id
        });

        res.status(200).json(new ApiResponse(200, null, "Class removed from academic year successfully"));
    } catch (error) {
        console.error("Error deleting specific academic year class:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting academic year class: ${error.message}`);
    }
});

const updateAcademicYearClasses = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { selected_classes } = req.body;
        const { AcademicYear, AcademicYearClasses, ClassMaster } = req.tenantModels;

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

        // Validate selected_classes array
        if (!selected_classes || !Array.isArray(selected_classes)) {
            throw new ApiError(400, "selected_classes array is required");
        }

        // Validate class IDs exist
        const classIds = selected_classes.map(item => item.class_id);
        const classes = await ClassMaster.findAll({
            where: {
                id: classIds,
                is_deleted: false
            }
        });

        if (classes.length !== classIds.length) {
            throw new ApiError(400, "One or more class IDs are invalid");
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year classes (soft delete)
            await AcademicYearClasses.update(
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

            // Create new academic year classes
            const academicYearClasses = [];
            for (const classItem of selected_classes) {
                const academicYearClass = await AcademicYearClasses.create({
                    academic_year_id: academicYear.id,
                    class_master_id: classItem.class_id,
                    created_by: req.user.id,
                    updated_by: req.user.id
                }, { transaction });
                
                academicYearClasses.push(academicYearClass);
            }

            // Commit transaction
            await transaction.commit();

            res.status(200).json(new ApiResponse(200, academicYearClasses, "Academic year classes updated successfully"));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error updating academic year classes:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while updating academic year classes: ${error.message}`);
    }
});

export {
    setupAcademicYearClasses,
    getAcademicYearClasses,
    getAvailableClasses,
    deleteAcademicYearClasses,
    deleteSpecificAcademicYearClass,
    updateAcademicYearClasses
};