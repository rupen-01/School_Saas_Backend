import cron from 'node-cron';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

let isCleanupRunning = false;

const cleanupExpiredAcademicYears = async () => {
    if (isCleanupRunning) {
        console.log('Cleanup already running, skipping...');
        return;
    }

    isCleanupRunning = true;
    console.log('🕐 Starting scheduled cleanup at:', new Date().toISOString());

    try {
        // Create database connection
        const sequelize = new Sequelize(
            process.env.DB_NAME,
            process.env.DB_USER,
            process.env.DB_PASS,
            { 
                host: process.env.DB_HOST,
                dialect: "postgres",
                logging: false,
                dialectOptions: {
                    ssl: process.env.NODE_ENV === 'production' ? {
                        require: true,
                        rejectUnauthorized: false
                    } : false
                }
            }
        );

        await sequelize.authenticate();
        console.log('✅ Database connection established for cleanup');

        // Get restore period from environment
        const restorePeriodDays = parseInt(process.env.ACADEMIC_YEAR_RESTORE_PERIOD_DAYS) || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - restorePeriodDays);
        
        console.log(`🗓️ Cleaning up academic years deleted before: ${cutoffDate.toISOString()}`);

        // Get all tenant schemas
        const schemas = await sequelize.query(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'public', 'pg_toast', 'neon_auth')",
            { type: sequelize.QueryTypes.SELECT }
        );

        let totalDeleted = 0;

        for (const schema of schemas) {
            const schemaName = schema.schema_name;
            console.log(`🔍 Processing schema: ${schemaName}`);

            try {
                // Check if academic_years table exists in this schema
                const tableExists = await sequelize.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = :schemaName 
                        AND table_name = 'academic_years'
                    )
                `, {
                    replacements: { schemaName },
                    type: sequelize.QueryTypes.SELECT
                });

                if (!tableExists[0].exists) {
                    console.log(`⏭️ Skipping ${schemaName} - academic_years table not found`);
                    continue;
                }

                // Count expired academic years before deletion
                const expiredCount = await sequelize.query(`
                    SELECT COUNT(*) as count 
                    FROM "${schemaName}".academic_years 
                    WHERE is_deleted = true 
                    AND deleted_at < :cutoffDate
                `, {
                    replacements: { cutoffDate },
                    type: sequelize.QueryTypes.SELECT
                });

                const count = parseInt(expiredCount[0].count);

                if (count > 0) {
                    // Permanently delete expired academic years
                    await sequelize.query(`
                        DELETE FROM "${schemaName}".academic_years 
                        WHERE is_deleted = true 
                        AND deleted_at < :cutoffDate
                    `, {
                        replacements: { cutoffDate },
                        type: sequelize.QueryTypes.DELETE
                    });

                    console.log(`🗑️ Deleted ${count} expired academic years from ${schemaName}`);
                    totalDeleted += count;
                } else {
                    console.log(`✅ No expired academic years found in ${schemaName}`);
                }

            } catch (error) {
                console.error(`❌ Error processing schema ${schemaName}:`, error.message);
            }
        }

        console.log(`🎉 Cleanup completed! Total deleted: ${totalDeleted} expired academic years`);
        
        await sequelize.close();
        
    } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error);
    } finally {
        isCleanupRunning = false;
        console.log('✅ Cleanup process finished');
    }
};

// Schedule cleanup to run daily at 2:00 AM
const startScheduledCleanup = () => {
    console.log('⏰ Scheduling cleanup to run daily at 2:00 AM');
    
    cron.schedule('0 2 * * *', async () => {
        await cleanupExpiredAcademicYears();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('✅ Scheduled cleanup initialized');
};

// Manual trigger for testing
const manualCleanup = async () => {
    await cleanupExpiredAcademicYears();
};

export {
    startScheduledCleanup,
    manualCleanup,
    cleanupExpiredAcademicYears
};