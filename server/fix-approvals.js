// One-time script to fix approval status for all existing users
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const User = require('./models/User');

        // List all users first
        const allUsers = await User.find().select('email role isApproved');
        console.log('Current users:');
        allUsers.forEach(u => {
            console.log(`  - ${u.email} | Role: ${u.role} | Approved: ${u.isApproved}`);
        });

        // Fix: Set all existing users to approved
        const result = await User.updateMany(
            { isApproved: { $ne: true } }, // Where not already true
            { $set: { isApproved: true } }
        );

        console.log(`\nFixed ${result.modifiedCount} users.`);

        // Verify
        const fixed = await User.find().select('email role isApproved');
        console.log('\nAfter fix:');
        fixed.forEach(u => {
            console.log(`  - ${u.email} | Role: ${u.role} | Approved: ${u.isApproved}`);
        });

        mongoose.disconnect();
        console.log('\nDone! All users should now be able to log in.');
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
