// Quick script to reset password for a specific user
require('dotenv').config();
const mongoose = require('mongoose');

const EMAIL = 'dhawan0685@gmail.com';
const NEW_PASSWORD = 'Kirpa@123';

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
