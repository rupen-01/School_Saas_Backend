import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const RoleModulePermissions = sequelize.define(
        "RoleModulePermissions",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            role_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'role_master',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            module_id: {
                type: DataTypes.UUID,
                allowNull: false,
                comment: 'Reference to Module in common schema'
            },
            sub_module_id: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: 'Reference to SubModule in common schema. NULL means module-level permission'
            },
            // CRUD Permissions
            can_view: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            can_create: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            can_update: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            can_delete: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            can_export: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            can_approve: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                comment: 'For workflow approvals'
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
            tableName: "role_module_permissions",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    unique: true,
                    fields: ['role_id', 'module_id', 'sub_module_id'],
                    where: {
                        is_deleted: false
                    },
                    name: 'role_perm_unique_idx'
                },
                {
                    fields: ['role_id'],
                    name: 'role_perm_role_idx'
                },
                {
                    fields: ['module_id'],
                    name: 'role_perm_module_idx'
                },
                {
                    fields: ['sub_module_id'],
                    name: 'role_perm_submodule_idx'
                },
                {
                    fields: ['is_deleted'],
                    name: 'role_perm_deleted_idx'
                },
                {
                    fields: ['role_id', 'is_deleted'],
                    name: 'role_perm_role_deleted_idx'
                }
            ]
        }
    );

    return RoleModulePermissions;
};

