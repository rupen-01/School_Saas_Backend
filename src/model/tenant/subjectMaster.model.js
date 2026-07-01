import { DataTypes } from "sequelize";

export default (sequelize, schema) => {
    const SubjectMaster = sequelize.define(
        "SubjectMaster",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            subject_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            subject_code: {
                type: DataTypes.STRING,
                allowNull: true
            },
            subject_type: {
                type: DataTypes.ENUM('academic', 'co-curricular', 'extra-curricular', 'sports', 'other'),
                defaultValue: 'academic',
                allowNull: false
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
            tableName: "subject_masters",
            timestamps: true,
            paranoid: false, // We'll handle soft delete manually
            indexes: [
                {
                    unique: true,
                    fields: ['subject_name'],
                    where: {
                        is_deleted: false
                    }
                },
                {
                    unique: true,
                    fields: ['subject_code'],
                    where: {
                        is_deleted: false,
                        subject_code: {
                            [sequelize.Sequelize.Op.ne]: null
                        }
                    }
                }
            ]
        }
    );

    return SubjectMaster;
};
