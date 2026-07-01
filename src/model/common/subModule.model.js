import { DataTypes } from "sequelize";

export default (sequelize) => {
  const SubModule = sequelize.define(
    "SubModule",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      moduleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "modules",
          key: "id",
        },
        unique: "uniq_module_sub_name"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: "uniq_module_sub_name"
      },
      price: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
    },
    {
      tableName: "sub_modules",
      schema: "public",
      timestamps: false,
      indexes: [
        {
          name: "uniq_module_sub_name",
          unique: true,
          fields: ["moduleId", "name"]
        }
      ]
    }
  );

  return SubModule;
};
