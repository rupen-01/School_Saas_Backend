import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const LeaveType = sequelize.define(
        "LeaveType",
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
            max_days: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
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
            tableName: "leave_types",
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

    return LeaveType;
};
