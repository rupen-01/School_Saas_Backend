import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const AcademicYear = sequelize.define(
        "AcademicYear",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            academic_year_label: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true
            },
            start_date: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            end_date: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM('draft', 'configured', 'active'),
                defaultValue: 'draft',
                allowNull: false
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
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
            tableName: "academic_years",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    unique: true,
                    fields: ['academic_year_label'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    unique: true,
                    fields: ['is_active'],
                    where: {
                        is_active: true,
                        is_deleted: false
                    }
                },
                {
                    fields: ['status']
                },
                {
                    fields: ['is_deleted']
                },
                {
                    fields: ['created_by']
                }
            ]
        }
    );

    return AcademicYear;
};