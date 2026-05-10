/**
 * Migration Script: Local MongoDB → Atlas
 * Copies data from local 'question_paper_db' and 'question-paper-generator' to Atlas 'qp-generator'
 */
require('dotenv').config();
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017';
const ATLAS_URI = 'mongodb+srv://dhawankaran760_db_user:Kirpa123@qp-generator.jtd6gln.mongodb.net/qp-generator?retryWrites=true&w=majority&appName=QP-Generator';

async function migrate() {
    // Connect to both databases
    const localConn = await mongoose.createConnection(LOCAL_URI + '/question_paper_db').asPromise();
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();

    console.log('✅ Connected to Local MongoDB');
    console.log('✅ Connected to Atlas');

    const atlasDb = atlasConn.getClient().db('qp-generator');

    // --- Step 1: Copy from question_paper_db (main data) ---
    console.log('\n📦 Copying from question_paper_db...');
    const localDb1 = localConn.getClient().db('question_paper_db');

    const collections = ['questions', 'paper', 'syllabusmaps', 'systemconfigs', 'users'];

    for (const colName of collections) {
        const docs = await localDb1.collection(colName).find({}).toArray();
        if (docs.length === 0) {
            console.log(`  ⏭️  ${colName}: 0 docs (skipped)`);
            continue;
        }

        // Clear existing data in Atlas for this collection
        await atlasDb.collection(colName).deleteMany({});

        // Insert all documents
        await atlasDb.collection(colName).insertMany(docs);
        console.log(`  ✅ ${colName}: ${docs.length} docs copied`);
    }

    // --- Step 2: Copy extra questions from question-paper-generator ---
    console.log('\n📦 Copying extra questions from question-paper-generator...');
    const localDb2 = localConn.getClient().db('question-paper-generator');
    const extraQuestions = await localDb2.collection('questions').find({}).toArray();

    if (extraQuestions.length > 0) {
        // Get existing question IDs to avoid duplicates
        const existingIds = new Set(
            (await atlasDb.collection('questions').find({}, { projection: { _id: 1 } }).toArray())
                .map(d => d._id.toString())
        );

        const newQuestions = extraQuestions.filter(q => !existingIds.has(q._id.toString()));

        if (newQuestions.length > 0) {
            await atlasDb.collection('questions').insertMany(newQuestions);
            console.log(`  ✅ questions: ${newQuestions.length} extra docs copied (${extraQuestions.length - newQuestions.length} duplicates skipped)`);
        } else {
            console.log(`  ⏭️  questions: all ${extraQuestions.length} already exist (skipped)`);
        }
    }

    // --- Step 3: Verify ---
    console.log('\n📊 Atlas qp-generator final counts:');
    for (const colName of collections) {
        const count = await atlasDb.collection(colName).countDocuments();
        console.log(`  ${colName}: ${count} docs`);
    }

    await localConn.close();
    await atlasConn.close();
    console.log('\n🎉 Migration complete!');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
