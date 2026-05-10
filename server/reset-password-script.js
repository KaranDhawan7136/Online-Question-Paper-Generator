// Quick script to reset password for a specific user
require('dotenv').config();
const mongoose = require('mongoose');

const EMAIL = process.argv[2];
const NEW_PASSWORD = process.argv[3];

if (!EMAIL || !NEW_PASSWORD) {
    console.log('Usage: node reset-password-script.js <email> <new_password>');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const User = require('./models/User');
        const user = await User.findOne({ email: EMAIL });

        if (!user) {
            console.log(`User ${EMAIL} not found!`);
            process.exit(1);
        }

        user.password = NEW_PASSWORD;
        await user.save();

        console.log(`✅ Password for ${EMAIL} has been changed to: ${NEW_PASSWORD}`);
        mongoose.disconnect();
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
