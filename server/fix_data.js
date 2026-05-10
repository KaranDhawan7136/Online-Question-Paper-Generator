require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    // Remove questions with null/empty/missing text
    const r1 = await db.collection('questions').deleteMany({ text: { $in: [null, ''] } });
    console.log('Deleted null/empty text:', r1.deletedCount);
    
    const r2 = await db.collection('questions').deleteMany({ text: { $exists: false } });
    console.log('Deleted missing text field:', r2.deletedCount);
    
    const remaining = await db.collection('questions').countDocuments();
    console.log('Questions remaining:', remaining);
    
    mongoose.disconnect();
}).catch(err => console.error(err.message));
