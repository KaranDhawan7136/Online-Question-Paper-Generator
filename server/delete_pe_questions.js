// Run: node delete_pe_questions.js
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { family: 4 }).then(async () => {
    const r = await mongoose.connection.collection('questions').deleteMany({
        subject: { $in: [/programming essentials/i] }
    });
    console.log('Deleted', r.deletedCount, 'Programming Essentials questions');
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
