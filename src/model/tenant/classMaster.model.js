import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const ClassMaster = sequelize.define(
        "ClassMaster",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            class_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            class_code: {
                type: DataTypes.STRING,
                allowNull: true
            },
            display_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
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
            tableName: "class_masters",
            timestamps: true,
            paranoid: false, // We'll handle soft delete manually
            indexes: [
                {
                    unique: true,
                    fields: ['class_name'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    unique: true,
                    fields: ['class_code'],
                    where: {
                        is_deleted: false,
                        class_code: {
                            [sequelize.Sequelize.Op.ne]: null
                        }
                    }
                }
            ]
        }
    );

    return ClassMaster;
};
