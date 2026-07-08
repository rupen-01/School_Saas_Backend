import { DataTypes } from "sequelize"
import bcrypt from "bcryptjs"
import jwt from 'jsonwebtoken';
import crypto from "crypto"

export default (sequelize,schema) => {
    const User = sequelize.define(
        "User",
        {
            id:{type:DataTypes.UUID,primaryKey: true, defaultValue:DataTypes.UUIDV4 },
            email:{type:DataTypes.STRING,unique:true,trim:true},
            password:DataTypes.STRING,
            role:DataTypes.ENUM("super-admin","school-admin","technical-admin","support-agent","sales","teacher","student"),
            schemaName:DataTypes.STRING,
            refreshToken:DataTypes.STRING,
            resetPasswordToken:DataTypes.STRING,
            resetPasswordExpire:DataTypes.DATE
        },
        {
            schema,
            tableName:"users",
            timestamps:true,
            hooks:{
                beforeSave:async(user, options)=>{
                    if(user.changed("password")){
                        try {
                            // Only check password history on updates, not on initial creation
                            if (!user.isNewRecord && !options.skipPasswordHistory) {
                                const RestorePassword = sequelize.models.RestorePassword;
                                if (RestorePassword && user.id) {
                                    const history = await RestorePassword.findAll({
                                        where: { userId: user.id },
                                        attributes: ['password'],
                                        transaction: options.transaction
                                    });
                                    for (const h of history) {
                                        const isSame = await bcrypt.compare(user.password, h.password);
                                        if (isSame) {
                                            throw new Error('New password cannot be the same as a previously used password');
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            // Re-throw to stop save
                            throw err;
                        }

                        user.password = await bcrypt.hash(user.password,10)
                        user.setDataValue('_passwordChanged', true);
                    }
                },
                afterSave: async (user, options)=>{
                    const isPasswordChanged = user.getDataValue('_passwordChanged');
                    const shouldSkipHistory = options.skipPasswordHistory || user.isNewRecord || options._isNewUser;

                    if (isPasswordChanged && !shouldSkipHistory) {
                        const RestorePassword = sequelize.models.RestorePassword;
                        if (RestorePassword) {
                            // Ensure the restore_passwords table exists before attempting writes
                            const qi = sequelize.getQueryInterface();
                            let tableExists = true;
                            try {
                                await qi.describeTable({ schema: 'public', tableName: 'restore_passwords' });
                            } catch (e) {
                                tableExists = false;
                            }

                            if (tableExists) {
                                await RestorePassword.create({
                                    userId: user.id,
                                    password: user.password
                                }, { transaction: options.transaction });
                                // Keep only the most recent 5 password records
                                const histories = await RestorePassword.findAll({
                                    where: { userId: user.id },
                                    order: [["createdAt", "DESC"]],
                                    transaction: options.transaction
                                });
                                if (histories.length > 5) {
                                    const toDelete = histories.slice(5); // older ones
                                    const ids = toDelete.map(h => h.id);
                                    await RestorePassword.destroy({
                                        where: { id: ids },
                                        transaction: options.transaction
                                    });
                                }
                            }
                        }
                        user.setDataValue('_passwordChanged', undefined);
                    }
                }
            }
        }
    )

    User.prototype.isPasswordCorrect = async function (password) {
        return await bcrypt.compare(password,this.password)
    }

    User.prototype.generateAccessToken = function () {
        return jwt.sign({
            id:this.id,
            role:this.role,
            schemaName:this.schemaName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:process.env.ACCESS_TOKEN_EXPIRE})
    }

    User.prototype.generateRefreshToken = function () {
        return jwt.sign({
            id:this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRE})

    }

    User.prototype.generateResetPasswordToken = function () {
        const resetToken = crypto.randomBytes(32).toString("hex");

        this.resetPasswordToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");

        this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins

        return resetToken;
    };

    return User
}