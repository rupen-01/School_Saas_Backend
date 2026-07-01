export const createSchema = async(sequelize,schema) =>{
    await sequelize.createSchema(schema,{ifNotExists: true});   
}