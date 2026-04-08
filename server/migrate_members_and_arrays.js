/**
 * Migration Script: Assign member IDs, convert subject/topic to arrays, assign serial numbers
 * 
 * Run with: node migrate_members_and_arrays.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Question = require('./models/Question');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI?.replace('localhost', '127.0.0.1') || 'mongodb://127.0.0.1:27017/qp-generator');
        console.log('✅ Connected to MongoDB');

        // 1. Assign memberIds to existing users
        console.log('\n📋 Assigning member IDs to users...');
        const users = await User.find({ $or: [{ memberId: null }, { memberId: { $exists: false } }] }).sort({ createdAt: 1 });
        const existingCount = await User.countDocuments({ memberId: { $exists: true, $ne: null } });
        
        for (let i = 0; i < users.length; i++) {
            const memberId = `MEM-${String(existingCount + i + 1).padStart(3, '0')}`;
            await User.updateOne({ _id: users[i]._id }, { $set: { memberId } });
            console.log(`   ${users[i].name} (${users[i].email}) → ${memberId}`);
        }
        console.log(`   ✅ ${users.length} users updated`);

        // 2. Convert subject and topic from strings to arrays
        console.log('\n📋 Converting subject/topic to arrays...');
        const questions = await Question.find({});
        let convertedCount = 0;

        for (const q of questions) {
            const updates = {};
            
            if (typeof q.subject === 'string') {
                updates.subject = q.subject.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (typeof q.topic === 'string') {
                updates.topic = q.topic.split(',').map(t => t.trim()).filter(Boolean);
            }

            if (Object.keys(updates).length > 0) {
                await Question.updateOne({ _id: q._id }, { $set: updates });
                convertedCount++;
            }
        }
        console.log(`   ✅ ${convertedCount} questions converted`);

        // 3. Assign serial numbers to questions without them
        console.log('\n📋 Assigning serial numbers...');
        const questionsNoSerial = await Question.find({
            $or: [{ serialNumber: null }, { serialNumber: { $exists: false } }]
        }).sort({ createdAt: 1 });

        const lastSerialQ = await Question.findOne(
            { serialNumber: { $exists: true, $ne: null } },
            { serialNumber: 1 }
        ).sort({ serialNumber: -1 });
        let nextSerial = (lastSerialQ?.serialNumber || 0) + 1;

        for (const q of questionsNoSerial) {
            await Question.updateOne({ _id: q._id }, { $set: { serialNumber: nextSerial } });
            nextSerial++;
        }
        console.log(`   ✅ ${questionsNoSerial.length} questions assigned serial numbers`);

        console.log('\n🎉 Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
