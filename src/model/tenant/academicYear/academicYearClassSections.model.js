import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const AcademicYearClassSections = sequelize.define(
        "AcademicYearClassSections",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            academic_year_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'academic_years',
                    key: 'id'
                }
            },
            class_master_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'class_masters',
                    key: 'id'
                }
            },
            section_master_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'section_masters',
                    key: 'id'
                }
            },
            // Audit fields
            created_by: {
                type: DataTypes.UUID,
                allowNull: false
            },
            updated_by: {
                type: DataTypes.UUID,
                allowNull: false
            },
            // Soft delete fields
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        },
        {
            schema,
            tableName: "academic_year_class_sections",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    unique: true,
                    name: 'academic_year_class_sections_unique',
                    fields: ['academic_year_id', 'class_master_id', 'section_master_id'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    name: 'academic_year_class_sections_academic_year_id',
                    fields: ['academic_year_id']
                },
                {
                    name: 'academic_year_class_sections_class_master_id',
                    fields: ['class_master_id']
                },
                {
                    name: 'academic_year_class_sections_section_master_id',
                    fields: ['section_master_id']
                },
                {
                    name: 'academic_year_class_sections_is_deleted',
                    fields: ['is_deleted']
                }
            ]
        }
    );

    return AcademicYearClassSections;
};
