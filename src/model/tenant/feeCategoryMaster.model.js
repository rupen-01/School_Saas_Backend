import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const FeeCategoryMaster = sequelize.define(
        "FeeCategoryMaster",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            category_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            category_code: {
                type: DataTypes.STRING,
                allowNull: true
            },
            category_type: {
                type: DataTypes.ENUM('mandatory', 'optional', 'one-time', 'recurring'),
                defaultValue: 'mandatory',
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false
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
            tableName: "fee_category_masters",
            timestamps: true,
            paranoid: false, // We'll handle soft delete manually
            indexes: [
                {
                    unique: true,
                    fields: ['category_name'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    unique: true,
                    fields: ['category_code'],
                    where: {
                        is_deleted: false,
                        category_code: {
                            [sequelize.Sequelize.Op.ne]: null
                        }
                    }
                }
            ]
        }
    );

    return FeeCategoryMaster;
};
