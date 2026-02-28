import mongoose from 'mongoose';
import Submission from './models/Submission.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/login_demo';

async function cleanupDuplicates() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all student-exam pairs that have more than one submission
    const duplicates = await Submission.aggregate([
        {
            $group: {
                _id: { student: '$student', exam: '$exam' },
                count: { $sum: 1 },
                latestId: { $last: '$_id' },
                ids: { $push: '$_id' }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`Found ${duplicates.length} student-exam pairs with duplicate submissions.`);

    let totalDeleted = 0;

    for (const dup of duplicates) {
        // Keep only the latest submission, delete the rest
        const idsToDelete = dup.ids.filter(id => id.toString() !== dup.latestId.toString());
        const result = await Submission.deleteMany({ _id: { $in: idsToDelete } });
        totalDeleted += result.deletedCount;
        console.log(`  Cleaned ${result.deletedCount} duplicates for student=${dup._id.student}, exam=${dup._id.exam}`);
    }

    console.log(`\nDone! Deleted ${totalDeleted} duplicate submissions total.`);
    await mongoose.disconnect();
}

cleanupDuplicates().catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
