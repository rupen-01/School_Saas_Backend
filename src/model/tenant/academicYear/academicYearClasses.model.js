import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const AcademicYearClasses = sequelize.define(
        "AcademicYearClasses",
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
            tableName: "academic_year_classes",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    unique: true,
                    fields: ['academic_year_id', 'class_master_id'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    fields: ['academic_year_id']
                },
                {
                    fields: ['class_master_id']
                }
            ]
        }
    );

    return AcademicYearClasses;
};