import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const RoleMaster = sequelize.define(
        "RoleMaster",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            role_name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            role_code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            is_system_role: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                comment: 'System roles cannot be deleted (Principal, Teacher, etc.)'
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
                defaultValue: false,
                allowNull: false
            }
        },
        {
            schema,
            tableName: "role_master",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    unique: true,
                    fields: ['role_code'],
                    where: {
                        is_deleted: false
                    },
                    name: 'role_master_unique_code'
                },
                {
                    fields: ['role_name'],
                    where: {
                        is_deleted: false
                    },
                    name: 'role_master_name_idx'
                },
                {
                    fields: ['is_active'],
                    name: 'role_master_active_idx'
                },
                {
                    fields: ['is_deleted'],
                    name: 'role_master_deleted_idx'
                },
                {
                    fields: ['is_system_role'],
                    name: 'role_master_system_idx'
                },
                {
                    fields: ['created_by'],
                    name: 'role_master_created_by_idx'
                }
            ]
        }
    );

    return RoleMaster;
};

