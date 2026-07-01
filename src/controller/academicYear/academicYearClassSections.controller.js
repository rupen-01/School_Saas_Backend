import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import asynchandler from "../../utils/asyncHandler.js";
import { Op } from "sequelize";

// ==================== ACADEMIC YEAR CLASS SECTIONS CONTROLLERS ====================

const setupAcademicYearClassSections = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { selected_sections } = req.body;
        const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, ClassMaster, SectionMaster } = req.tenantModels;

        console.log('=== SETUP ACADEMIC YEAR CLASS SECTIONS DEBUG ===');
        console.log('academicYearId:', academicYearId);
        console.log('selected_sections:', selected_sections);

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

        // Validate selected_sections array
        if (!selected_sections || !Array.isArray(selected_sections)) {
            throw new ApiError(400, "selected_sections array is required");
        }

        if (selected_sections.length === 0) {
            throw new ApiError(400, "At least one class-section combination must be provided");
        }

        // Validate that all class_ids are from selected classes
        const providedClassIds = selected_sections.map(item => item.class_id);
        const invalidClassIds = providedClassIds.filter(classId => !selectedClassIds.includes(classId));
        
        if (invalidClassIds.length > 0) {
            throw new ApiError(400, `Invalid class IDs: ${invalidClassIds.join(', ')}. Only classes selected for this academic year are allowed.`);
        }

        // Validate sections for each class
        for (const classSection of selected_sections) {
            const { class_id, section_ids } = classSection;
            
            if (!section_ids || !Array.isArray(section_ids) || section_ids.length === 0) {
                throw new ApiError(400, `Section IDs are required for class ${class_id}`);
            }

            // Validate that sections belong to the class
            const sections = await SectionMaster.findAll({
                where: {
                    id: section_ids,
                    is_deleted: false
                }
            });

            if (sections.length !== section_ids.length) {
                throw new ApiError(400, `One or more section IDs are invalid for class ${class_id}`);
            }
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year class sections (soft delete)
            await AcademicYearClassSections.update(
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

            // Create new academic year class sections
            const academicYearClassSections = [];
            for (const classSection of selected_sections) {
                const { class_id, section_ids } = classSection;
                
                for (const section_id of section_ids) {
                    const academicYearClassSection = await AcademicYearClassSections.create({
                        academic_year_id: academicYear.id,
                        class_master_id: class_id,
                        section_master_id: section_id,
                        created_by: req.user.id,
                        updated_by: req.user.id
                    }, { transaction });
                    
                    academicYearClassSections.push(academicYearClassSection);
                }
            }

            // Commit transaction
            await transaction.commit();

            console.log('Academic year class sections created successfully:', academicYearClassSections.length);

            res.status(201).json(new ApiResponse(201, academicYearClassSections, `Class sections setup successfully for academic year ${academicYear.academic_year_label}`));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error setting up academic year class sections:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while setting up academic year class sections: ${error.message}`);
    }
});

const getAcademicYearClassSections = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClassSections, ClassMaster, SectionMaster } = req.tenantModels;

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

        // Get academic year class sections with related data
        const academicYearClassSections = await AcademicYearClassSections.findAll({
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
                    model: SectionMaster,
                    as: 'sectionMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ],
            order: [
                ['classMaster', 'class_name', 'ASC'],
                ['sectionMaster', 'section_name', 'ASC']
            ]
        });

        // Group sections by class
        const sectionsByClass = {};
        academicYearClassSections.forEach(item => {
            const classId = item.class_master_id;
            if (!sectionsByClass[classId]) {
                sectionsByClass[classId] = {
                    class_id: classId,
                    class_name: item.classMaster.class_name,
                    sections: []
                };
            }
            sectionsByClass[classId].sections.push({
                section_id: item.section_master_id,
                section_name: item.sectionMaster.section_name
            });
        });

        const groupedSections = Object.values(sectionsByClass);

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            sections_by_class: groupedSections,
            total_sections: academicYearClassSections.length
        }, "Academic year class sections retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving academic year class sections:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving academic year class sections: ${error.message}`);
    }
});

const getAvailableSectionsForAcademicYear = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClasses, ClassMaster, SectionMaster } = req.tenantModels;

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

        // Get all sections for selected classes
        const availableSections = await SectionMaster.findAll({
            where: {
                class_master_id: selectedClassIds,
                is_deleted: false
            },
            include: [
                {
                    model: ClassMaster,
                    as: 'classMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ],
            order: [
                ['classMaster', 'class_name', 'ASC'],
                ['section_name', 'ASC']
            ]
        });

        // Group sections by class
        const sectionsByClass = {};
        availableSections.forEach(section => {
            const classId = section.class_master_id;
            if (!sectionsByClass[classId]) {
                sectionsByClass[classId] = {
                    class_id: classId,
                    class_name: section.classMaster.class_name,
                    sections: []
                };
            }
            sectionsByClass[classId].sections.push({
                section_id: section.id,
                section_name: section.section_name
            });
        });

        const groupedSections = Object.values(sectionsByClass);

        res.status(200).json(new ApiResponse(200, {
            academic_year: academicYear,
            available_sections_by_class: groupedSections,
            total_available_sections: availableSections.length
        }, "Available sections for academic year retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving available sections:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving available sections: ${error.message}`);
    }
});

const deleteAcademicYearClassSections = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { AcademicYear, AcademicYearClassSections } = req.tenantModels;

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

        // Soft delete all academic year class sections
        await AcademicYearClassSections.update(
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

        res.status(200).json(new ApiResponse(200, null, "Academic year class sections deleted successfully"));
    } catch (error) {
        console.error("Error deleting academic year class sections:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting academic year class sections: ${error.message}`);
    }
});

const updateAcademicYearClassSections = asynchandler(async (req, res) => {
    try {
        const { academicYearId } = req.params;
        const { selected_sections } = req.body;
        const { AcademicYear, AcademicYearClasses, AcademicYearClassSections, ClassMaster, SectionMaster } = req.tenantModels;

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

        // Validate selected_sections array
        if (!selected_sections || !Array.isArray(selected_sections)) {
            throw new ApiError(400, "selected_sections array is required");
        }

        // Validate that all class_ids are from selected classes
        const providedClassIds = selected_sections.map(item => item.class_id);
        const invalidClassIds = providedClassIds.filter(classId => !selectedClassIds.includes(classId));
        
        if (invalidClassIds.length > 0) {
            throw new ApiError(400, `Invalid class IDs: ${invalidClassIds.join(', ')}. Only classes selected for this academic year are allowed.`);
        }

        // Validate sections for each class
        for (const classSection of selected_sections) {
            const { class_id, section_ids } = classSection;
            
            if (!section_ids || !Array.isArray(section_ids) || section_ids.length === 0) {
                throw new ApiError(400, `Section IDs are required for class ${class_id}`);
            }

            // Validate that sections belong to the class
            const sections = await SectionMaster.findAll({
                where: {
                    id: section_ids,
                    class_master_id: class_id,
                    is_deleted: false
                }
            });

            if (sections.length !== section_ids.length) {
                throw new ApiError(400, `One or more section IDs are invalid for class ${class_id}`);
            }
        }

        // Get sequelize instance
        const sequelize = AcademicYear.sequelize;
        
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Delete existing academic year class sections (soft delete)
            await AcademicYearClassSections.update(
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

            // Create new academic year class sections
            const academicYearClassSections = [];
            for (const classSection of selected_sections) {
                const { class_id, section_ids } = classSection;
                
                for (const section_id of section_ids) {
                    const academicYearClassSection = await AcademicYearClassSections.create({
                        academic_year_id: academicYear.id,
                        class_master_id: class_id,
                        section_master_id: section_id,
                        created_by: req.user.id,
                        updated_by: req.user.id
                    }, { transaction });
                    
                    academicYearClassSections.push(academicYearClassSection);
                }
            }

            // Commit transaction
            await transaction.commit();

            res.status(200).json(new ApiResponse(200, academicYearClassSections, "Academic year class sections updated successfully"));
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error updating academic year class sections:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while updating academic year class sections: ${error.message}`);
    }
});

const deleteSpecificAcademicYearClassSection = asynchandler(async (req, res) => {
    try {
        const { academicYearId, sectionId } = req.params;
        const { AcademicYear, AcademicYearClassSections } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: { id: academicYearId, is_deleted: false }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Soft delete specific section
        const [updatedRows] = await AcademicYearClassSections.update(
            {
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: req.user.id
            },
            {
                where: {
                    id: sectionId,
                    academic_year_id: academicYearId,
                    is_deleted: false
                }
            }
        );

        if (updatedRows === 0) {
            throw new ApiError(404, "Section not found for this academic year");
        }

        res.status(200).json(new ApiResponse(200, null, "Section deleted successfully from academic year"));
    } catch (error) {
        console.error("Error deleting specific section:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while deleting section: ${error.message}`);
    }
});

// GET /academic-year/{academicYearId}/sections/class/{classId}
const getSectionsByClass = asynchandler(async (req, res) => {
    try {
        const { academicYearId, classId } = req.params;
        const { AcademicYear, AcademicYearClassSections, ClassMaster, SectionMaster } = req.tenantModels;

        // Validate academic year exists
        const academicYear = await AcademicYear.findOne({
            where: { id: academicYearId, is_deleted: false }
        });

        if (!academicYear) {
            throw new ApiError(404, "Academic year not found");
        }

        // Get sections for specific class
        const sections = await AcademicYearClassSections.findAll({
            where: {
                academic_year_id: academicYearId,
                class_master_id: classId,
                is_deleted: false
            },
            include: [
                {
                    model: SectionMaster,
                    as: 'sectionMaster',
                    where: { is_deleted: false },
                    required: true
                }
            ]
        });

        res.status(200).json(new ApiResponse(200, sections, "Sections for class retrieved successfully"));
    } catch (error) {
        console.error("Error retrieving sections by class:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error while retrieving sections: ${error.message}`);
    }
});

export {
    setupAcademicYearClassSections,
    getAcademicYearClassSections,
    getAvailableSectionsForAcademicYear,
    deleteAcademicYearClassSections,
    updateAcademicYearClassSections,
    deleteSpecificAcademicYearClassSection,
    getSectionsByClass
};
