import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const LeavePolicyDepartment = sequelize.define(
        "LeavePolicyDepartment",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            leave_policy_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'leave_policies',
                    key: 'id'
                }
            },
            department_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'departments',
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
            tableName: "leave_policy_departments",
            timestamps: true,
            paranoid: false, // We'll handle soft delete manually
            indexes: [
                {
                    unique: true,
                    fields: ['leave_policy_id', 'department_id'],
                    where: {
                        is_deleted: false
                    }
                }
            ]
        }
    );

    return LeavePolicyDepartment;
};

