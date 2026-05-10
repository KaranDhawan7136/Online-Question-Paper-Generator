require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Question = require('./models/Question');
    
    const total = await Question.countDocuments();
    console.log('Total questions:', total);
    
    // Check for null/empty text
    const nullText = await Question.countDocuments({ text: { $in: [null, ''] } });
    const noTextField = await Question.countDocuments({ text: { $exists: false } });
    console.log('Null/empty text:', nullText);
    console.log('Missing text field:', noTextField);
    
    // Check for null subject
    const nullSubject = await Question.countDocuments({ subject: null });
    console.log('Null subject:', nullSubject);
    
    // Sample a few questions
    const samples = await Question.find({}).limit(3).lean();
    samples.forEach((q, i) => {
        console.log(`\nQ${i+1}:`, {
            _id: q._id,
            text: q.text ? q.text.substring(0, 60) : 'NULL/UNDEFINED',
            textType: typeof q.text,
            subject: q.subject,
            subjectType: typeof q.subject,
            isSubjectArray: Array.isArray(q.subject),
            serialNumber: q.serialNumber,
            createdBy: q.createdBy
        });
    });
    
    // Try the exact API query with populate
    try {
        const questions = await Question.find({})
            .populate('createdBy', 'memberId name role')
            .limit(5)
            .sort({ serialNumber: 1 });
        console.log('\nPopulated query succeeded, count:', questions.length);
        if (questions[0]) {
            const q = questions[0].toObject();
            console.log('First question createdBy:', q.createdBy);
        }
    } catch (err) {
        console.log('\nPopulated query FAILED:', err.message);
    }
    
    mongoose.disconnect();
}).catch(err => console.error('Connection error:', err.message));
