import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const AcademicYearFeeStructure = sequelize.define(
        "AcademicYearFeeStructure",
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
            fee_category_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'fee_category_masters',
                    key: 'id'
                }
            },
            total_amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            due_date: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            installment_type: {
                type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
                defaultValue: 'yearly',
                allowNull: false
            },
            installment_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            is_mandatory: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
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
            tableName: "academic_year_fee_structures",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    unique: true,
                    name: 'academic_year_fee_structures_unique',
                    fields: ['academic_year_id', 'class_master_id', 'fee_category_id'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    name: 'academic_year_fee_structures_academic_year_id',
                    fields: ['academic_year_id']
                },
                {
                    name: 'academic_year_fee_structures_class_master_id',
                    fields: ['class_master_id']
                },
                {
                    name: 'academic_year_fee_structures_fee_category_id',
                    fields: ['fee_category_id']
                },
                {
                    name: 'academic_year_fee_structures_is_deleted',
                    fields: ['is_deleted']
                }
            ]
        }
    );

    return AcademicYearFeeStructure;
};
