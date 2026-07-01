import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== ACADEMIC YEAR FEE STRUCTURE CONTROLLERS ====================

const setupAcademicYearFeeStructure = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { fee_structure } = req.body;
        const { AcademicYear, AcademicYearClasses, AcademicYearFeeStructure, ClassMaster, FeeCategoryMaster } = req.tenantModels;

        console.log('=== SETUP ACADEMIC YEAR FEE STRUCTURE DEBUG ===');
        console.log('academicYearId:', academicYearId);
        console.log('fee_structure:', fee_structure);

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

        // Validate fee_structure array
        if (!fee_structure || !Array.isArray(fee_structure)) {
            throw new ApiError(400, "fee_structure array is required");
        }

        if (fee_structure.length === 0) {
            throw new ApiError(400, "At least one class-fee combination must be provided");
        }

        // Validate that all class_ids are from selected classes
        const providedClassIds = fee_structure.map(item => item.class_id);
        const invalidClassIds = providedClassIds.filter(classId => !selectedClassIds.includes(classId));
        
        if (invalidClassIds.length > 0) {
            throw new ApiError(400, `Invalid class IDs: ${invalidClassIds.join(', ')}. Only classes selected for this academic year are allowed.`);
        }

        // Validate fees for each class
        for (const classFee of fee_structure) {
            const { class_id, fees } = classFee;
            
            if (!fees || !Array.isArray(fees) || fees.length === 0) {
                throw new ApiError(400, `Fees are required for class ${class_id}`);
            }

            for (const fee of fees) {
                const { fee_category_id, total_amount, due_date, installment_type, installment_count, is_mandatory, description } = fee;
                
                // Validate required fields
                if (!fee_category_id) {
                    throw new ApiError(400, `Fee category ID is required for class ${class_id}`);
                }
                if (!total_amount || total_amount <= 0) {
                    throw new ApiError(400, `Valid total amount is required for class ${class_id}`);
                }
                if (!due_date) {
                    throw new ApiError(400, `Due date is required for class ${class_id}`);
                }
                if (!installment_type || !['monthly', 'quarterly', 'yearly'].includes(installment_type)) {
                    throw new ApiError(400, `Valid installment type (monthly, quarterly, yearly) is required for class ${class_id}`);
                }
                if (!installment_count || installment_count < 1) {
                    throw new ApiError(400, `Valid installment count (>=1) is required for class ${class_id}`);
                }
            }

            // Validate that fee categories exist
            const feeCategoryIds = fees.map(fee => fee.fee_category_id);
            const feeCategories = await FeeCategoryMaster.findAll({
                where: {
                    id: feeCategoryIds,
                    is_deleted: false
                }
            });

            if (feeCategories.length !== feeCategoryIds.length) {
                throw new ApiError(400, `One or more fee category IDs are invalid for class ${class_id}`);
            }
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year fee structure (soft delete)
            await AcademicYearFeeStructure.update(
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

            // Create new academic year fee structure
            const academicYearFeeStructures = [];
            for (const classFee of fee_structure) {
                const { class_id, fees } = classFee;
                
                for (const fee of fees) {
                    const { fee_category_id, total_amount, due_date, installment_type, installment_count, is_mandatory, description } = fee;
                    
                    const academicYearFeeStructure = await AcademicYearFeeStructure.create({
                        academic_year_id: academicYear.id,
                        class_master_id: class_id,
                        fee_category_id: fee_category_id,
                        total_amount: total_amount,
                        due_date: due_date,
                        installment_type: installment_type,
                        installment_count: installment_count,
                        is_mandatory: is_mandatory !== undefined ? is_mandatory : true,
                        description: description || null,
                        created_by: req.user.id,
                        updated_by: req.user.id
                    }, { transaction });
                    
                    academicYearFeeStructures.push(academicYearFeeStructure);
                }
            }

            // Commit transaction
            await transaction.commit();

            console.log('Academic year fee structure created successfully:', academicYearFeeStructures.length);

            res.status(201).json(new ApiResponse(201, academicYearFeeStructures, `Fee structure setup successfully for academic year ${academicYear.academic_year_label}`));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error setting up academic year fee structure:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while setting up academic year fee structure: ${error.message}`);
    }
});

const getAcademicYearFeeStructure = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearFeeStructure, ClassMaster, FeeCategoryMaster } = req.tenantModels;

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

        // Get academic year fee structure with related data
        const academicYearFeeStructures = await AcademicYearFeeStructure.findAll({
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
                    model: FeeCategoryMaster,
                    as: 'feeCategory',
                    where: { is_deleted: false },
                    required: true
                }
            ],
            order: [
                ['classMaster', 'class_name', 'ASC'],
                ['feeCategory', 'category_name', 'ASC']
            ]
        });

        // Group fees by class
        const feesByClass = {};
        academicYearFeeStructures.forEach(item => {
            const classId = item.class_master_id;
            if (!feesByClass[classId]) {
                feesByClass[classId] = {
                    class_id: classId,
                    class_name: item.classMaster.class_name,
                    class_code: item.classMaster.class_code,
                    fees: []
                };
            }
            feesByClass[classId].fees.push({
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
        });

        const groupedFees = Object.values(feesByClass);

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            fee_structure_by_class: groupedFees,
            total_fees: academicYearFeeStructures.length
        }, "Academic year fee structure retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving academic year fee structure:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving academic year fee structure: ${error.message}`);
    }
});

const getAvailableFeeCategoriesForAcademicYear = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClasses, ClassMaster, FeeCategoryMaster } = req.tenantModels;

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

        // Get all fee categories
        const availableFeeCategories = await FeeCategoryMaster.findAll({
            where: {
                is_deleted: false
            },
            order: [
                ['category_name', 'ASC']
            ]
        });

        // Group fee categories by class (all fee categories are available for all classes)
        const feeCategoriesByClass = {};
        selectedClasses.forEach(classItem => {
            const classId = classItem.class_master_id;
            feeCategoriesByClass[classId] = {
                class_id: classId,
                class_name: classItem.classMaster.class_name,
                class_code: classItem.classMaster.class_code,
                fee_categories: availableFeeCategories.map(feeCategory => ({
                    fee_category_id: feeCategory.id,
                    category_name: feeCategory.category_name,
                    category_type: feeCategory.category_type
                }))
            };
        });

        const groupedFeeCategories = Object.values(feeCategoriesByClass);

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            available_fee_categories_by_class: groupedFeeCategories,
            total_available_fee_categories: availableFeeCategories.length
        }, "Available fee categories for academic year retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving available fee categories:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving available fee categories: ${error.message}`);
    }
});

const deleteAcademicYearFeeStructure = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearFeeStructure } = req.tenantModels;

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

        // Soft delete all academic year fee structure
        await AcademicYearFeeStructure.update(
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

        res.status(200).json(new ApiResponse(200, null, "Academic year fee structure deleted successfully"));
    } catch (error) {
        console.error("Error deleting academic year fee structure:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting academic year fee structure: ${error.message}`);
    }
});

const updateAcademicYearFeeStructure = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { fee_structure } = req.body;
        const { AcademicYear, AcademicYearClasses, AcademicYearFeeStructure, ClassMaster, FeeCategoryMaster } = req.tenantModels;

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

        // Validate fee_structure array
        if (!fee_structure || !Array.isArray(fee_structure)) {
            throw new ApiError(400, "fee_structure array is required");
        }

        // Validate that all class_ids are from selected classes
        const providedClassIds = fee_structure.map(item => item.class_id);
        const invalidClassIds = providedClassIds.filter(classId => !selectedClassIds.includes(classId));
        
        if (invalidClassIds.length > 0) {
            throw new ApiError(400, `Invalid class IDs: ${invalidClassIds.join(', ')}. Only classes selected for this academic year are allowed.`);
        }

        // Validate fees for each class
        for (const classFee of fee_structure) {
            const { class_id, fees } = classFee;
            
            if (!fees || !Array.isArray(fees) || fees.length === 0) {
                throw new ApiError(400, `Fees are required for class ${class_id}`);
            }

            for (const fee of fees) {
                const { fee_category_id, total_amount, due_date, installment_type, installment_count, is_mandatory, description } = fee;
                
                // Validate required fields
                if (!fee_category_id) {
                    throw new ApiError(400, `Fee category ID is required for class ${class_id}`);
                }
                if (!total_amount || total_amount <= 0) {
                    throw new ApiError(400, `Valid total amount is required for class ${class_id}`);
                }
                if (!due_date) {
                    throw new ApiError(400, `Due date is required for class ${class_id}`);
                }
                if (!installment_type || !['monthly', 'quarterly', 'yearly'].includes(installment_type)) {
                    throw new ApiError(400, `Valid installment type (monthly, quarterly, yearly) is required for class ${class_id}`);
                }
                if (!installment_count || installment_count < 1) {
                    throw new ApiError(400, `Valid installment count (>=1) is required for class ${class_id}`);
                }
            }

            // Validate that fee categories exist
            const feeCategoryIds = fees.map(fee => fee.fee_category_id);
            const feeCategories = await FeeCategoryMaster.findAll({
                where: {
                    id: feeCategoryIds,
                    is_deleted: false
                }
            });

            if (feeCategories.length !== feeCategoryIds.length) {
                throw new ApiError(400, `One or more fee category IDs are invalid for class ${class_id}`);
            }
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year fee structure (soft delete)
            await AcademicYearFeeStructure.update(
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

            // Create new academic year fee structure
            const academicYearFeeStructures = [];
            for (const classFee of fee_structure) {
                const { class_id, fees } = classFee;
                
                for (const fee of fees) {
                    const { fee_category_id, total_amount, due_date, installment_type, installment_count, is_mandatory, description } = fee;
                    
                    const academicYearFeeStructure = await AcademicYearFeeStructure.create({
                        academic_year_id: academicYear.id,
                        class_master_id: class_id,
                        fee_category_id: fee_category_id,
                        total_amount: total_amount,
                        due_date: due_date,
                        installment_type: installment_type,
                        installment_count: installment_count,
                        is_mandatory: is_mandatory !== undefined ? is_mandatory : true,
                        description: description || null,
                        created_by: req.user.id,
                        updated_by: req.user.id
                    }, { transaction });
                    
                    academicYearFeeStructures.push(academicYearFeeStructure);
                }
            }

            // Commit transaction
            await transaction.commit();

            res.status(200).json(new ApiResponse(200, academicYearFeeStructures, "Academic year fee structure updated successfully"));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error updating academic year fee structure:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while updating academic year fee structure: ${error.message}`);
    }
});

const deleteSpecificAcademicYearFeeStructure = asynchandler(async (req, res) => {
    try {
        const { academicYearId, feeStructureId } = req.params;
        const { AcademicYear, AcademicYearFeeStructure } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: { id: academicYearId, is_deleted: false }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Soft delete specific fee structure
        const [updatedRows] = await AcademicYearFeeStructure.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: req.user.id
            },
            {
                where: {
                    id: feeStructureId,
                    academic_year_id: academicYearId,
                    is_deleted: false
                }
            }
        );

        if (updatedRows === 0) {
            throw new ApiError(404, "Fee structure not found for this academic year");
        }

        res.status(200).json(new ApiResponse(200, null, "Fee structure deleted successfully from academic year"));
    } catch (error) {
        console.error("Error deleting specific fee structure:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting fee structure: ${error.message}`);
    }
});

const getFeeStructureByClass = asynchandler(async (req, res) => {
    try {
        const { academicYearId, classId } = req.params;
        const { AcademicYear, AcademicYearFeeStructure, FeeCategoryMaster } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: { id: academicYearId, is_deleted: false }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Get fee structure for specific class
        const feeStructures = await AcademicYearFeeStructure.findAll({
            where: {
                academic_year_id: academicYearId,
                class_master_id: classId,
                is_deleted: false
            },
            include: [
                {
                    model: FeeCategoryMaster,
                    as: 'feeCategory',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });

        res.status(200).json(new ApiResponse(200, feeStructures, "Fee structure for class retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving fee structure by class:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving fee structure: ${error.message}`);
    }
});

export {
    setupAcademicYearFeeStructure,
    getAcademicYearFeeStructure,
    getAvailableFeeCategoriesForAcademicYear,
    deleteAcademicYearFeeStructure,
    updateAcademicYearFeeStructure,
    deleteSpecificAcademicYearFeeStructure,
    getFeeStructureByClass
};
