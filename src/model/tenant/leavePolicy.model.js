import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const LeavePolicy = sequelize.define(
        "LeavePolicy",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            leave_type_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'leave_types',
                    key: 'id'
                }
            },
            max_days_per_year: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            auto_approve: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            approval_required: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false
            },
            status: {
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
            tableName: "leave_policies",
            timestamps: true,
            paranoid: false, // We'll handle soft delete manually
            indexes: [
                {
                    unique: true,
                    fields: ['name'],
                    where: {
                        is_deleted: false
                    }
                }
            ]
        }
    );

    return LeavePolicy;
};
