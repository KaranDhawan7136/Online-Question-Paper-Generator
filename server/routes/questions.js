const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mammoth = require('mammoth');
const Question = require('../models/Question');
const SyllabusMap = require('../models/SyllabusMap');
const { determineBloomsTaxonomy } = require('../utils/bloomsAnalyzer');
const { parseQuestionBank } = require('../utils/qbankParser');
const { matchQuestionsToCHO } = require('../utils/keywordTopicMatcher');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Image upload config: only allow image files, 5MB max
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'question-images');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const imageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (allowed.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
        }
    }
});

// Helper: get next serial number
async function getNextSerialNumber(count = 1) {
    const lastQuestion = await Question.findOne({}, { serialNumber: 1 }).sort({ serialNumber: -1 });
    const start = (lastQuestion?.serialNumber || 0) + 1;
    return Array.from({ length: count }, (_, i) => start + i);
}

function parseToArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => v.trim()).filter(Boolean);
    return value.split(',').map(v => v.trim()).filter(Boolean);
}

// Helper: auto-fill unit, lecture, clo, and blooms
// userId: optional — when provided, use this user's own CHO first, fallback to any
async function autoFillFields(questionsArray, userId) {
    // 1. Gather all unique subjects involved to fetch their syllabus maps once
    const subjectsToFetch = new Set();
    questionsArray.forEach(q => {
        if (q.subject && q.subject.length > 0) {
            q.subject.forEach(s => subjectsToFetch.add(s));
        }
    });

    const syllabusMapDict = {};
    for (const sub of subjectsToFetch) {
        let map = null;
        // If userId is provided, try to find the user's own CHO first
        if (userId) {
            map = await SyllabusMap.findOne({
                subject: new RegExp(`^${sub}$`, 'i'),
                createdBy: userId
            });
        }
        // Fallback: find any CHO for this subject
        if (!map) {
            map = await SyllabusMap.findOne({ subject: new RegExp(`^${sub}$`, 'i') });
        }
        if (map) {
            syllabusMapDict[sub.toLowerCase()] = map.mappings;
        }
    }

    // 2. Process each question
    for (const q of questionsArray) {
        // Auto-fill Unit/Lecture/CLO based on Topic + Subject
        // Only override if the user didn't explicitly provide them (or they rely on default empty values)
        if (q.topic && q.topic.length > 0 && q.subject && q.subject.length > 0) {
            // We just use the first subject to find a map for simplicity
            const subjectKey = q.subject[0].toLowerCase();
            const mappings = syllabusMapDict[subjectKey] || [];
            
            // Try to find any matching topic among the question's topics
            let matchedMapping = null;
            for (const t of q.topic) {
                const match = mappings.find(m => m.topic.toLowerCase() === t.toLowerCase());
                if (match) {
                    matchedMapping = match;
                    break;
                }
            }

            if (matchedMapping) {
                if (!q.unit || q.unit.trim() === '') q.unit = matchedMapping.unit;
                if (!q.lectureNumber || q.lectureNumber.trim() === '') q.lectureNumber = matchedMapping.lectureNumber || '';
                if (!q.cloMapping || q.cloMapping === 1) q.cloMapping = matchedMapping.cloMapping || 1; 
                // 1 is our default cloMapping in the forms, so we override if it's 1
            }
        }

        // Auto-fill Bloom's Taxonomy based on question text
        // If it's single form creation, the form defaults to 'U', we can override it based on text. For csv/word, it might be U.
        if (q.text) {
            const calculatedBlooms = determineBloomsTaxonomy(q.text);
            // Always assign calculated taxonomy if they didn't explicitly override, 
            // but we'll always override default 'U' to be smart.
            if (!q.bloomsTaxonomy || q.bloomsTaxonomy === 'U') {
                q.bloomsTaxonomy = calculatedBlooms;
            }
        }
    }
}

// Get all questions with filters
router.get('/', auth, async (req, res) => {
    try {
        const { subject, unit, difficulty, questionType, page = 1, limit = 20, search } = req.query;

        const filter = {};
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { text: searchRegex },
                { topic: searchRegex },
                { subject: searchRegex }
            ];
        }
        if (subject) filter.subject = { $in: [new RegExp(subject, 'i')] };
        if (unit) filter.unit = new RegExp(unit, 'i');
        if (difficulty) filter.difficulty = difficulty;
        if (questionType) filter.questionType = questionType;

        const questions = await Question.find(filter)
            .populate('createdBy', 'memberId name role')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ serialNumber: 1 });

        const total = await Question.countDocuments(filter);

        // Role-based creator info: admin sees memberId + name, others see only memberId
        const isAdmin = req.user.role === 'admin';
        const questionsData = questions.map(q => {
            const qObj = q.toObject();
            if (qObj.createdBy) {
                if (isAdmin) {
                    qObj.creatorInfo = {
                        memberId: qObj.createdBy.memberId,
                        name: qObj.createdBy.name
                    };
                } else {
                    qObj.creatorInfo = {
                        memberId: qObj.createdBy.memberId
                    };
                }
            } else {
                qObj.creatorInfo = null;
            }
            delete qObj.createdBy;
            return qObj;
        });

        res.json({
            questions: questionsData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single question
router.get('/:id', auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id).populate('createdBy', 'memberId name role');
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json(question);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create question
router.post('/', auth, async (req, res) => {
    try {
        const body = { ...req.body };
        // Ensure subject and topic are arrays
        body.subject = parseToArray(body.subject);
        body.topic = parseToArray(body.topic);
        body.createdBy = req.user._id;

        // Check for duplicates (case-insensitive)
        const existingQuestion = await Question.findOne({
            text: { $regex: new RegExp('^' + body.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        });

        if (existingQuestion) {
            return res.status(400).json({ error: 'Question already exists in the database.' });
        }

        // Apply auto-fill behavior using this user's CHO
        await autoFillFields([body], req.user._id);

        const question = new Question(body);
        await question.save();
        res.status(201).json({ message: 'Question created', question });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update question
router.put('/:id', auth, async (req, res) => {
    try {
        const body = { ...req.body };
        // Ensure subject and topic are arrays on update too
        if (body.subject) body.subject = parseToArray(body.subject);
        if (body.topic) body.topic = parseToArray(body.topic);

        const question = await Question.findByIdAndUpdate(
            req.params.id,
            body,
            { new: true, runValidators: true }
        );
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({ message: 'Question updated', question });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete all questions by subject name (must come BEFORE /:id)
router.delete('/by-subject/:subject', auth, async (req, res) => {
    try {
        const subject = decodeURIComponent(req.params.subject).trim();
        if (!subject) {
            return res.status(400).json({ error: 'Subject name is required' });
        }
        const result = await Question.deleteMany({ subject: new RegExp(`^${subject}$`, 'i') });
        res.json({ message: `${result.deletedCount} questions deleted for "${subject}"`, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete question
router.delete('/:id', auth, async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({ message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk delete multiple questions by IDs
router.post('/bulk-delete', auth, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No question IDs provided' });
        }
        const result = await Question.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${result.deletedCount} questions deleted`, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk upload via CSV
router.post('/upload-csv', auth, upload.single('file'), async (req, res) => {
    try {
        const results = [];

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                results.push({
                    text: data.text || data.question,
                    subject: parseToArray(data.subject),
                    topic: parseToArray(data.topic),
                    unit: data.unit || data.chapter || '',
                    lectureNumber: data.lectureNumber || '',
                    difficultyLevel: parseInt(data.difficultyLevel) || 2,
                    estimatedTime: parseInt(data.estimatedTime) || 5,
                    marks: parseInt(data.marks) || 1,
                    questionType: data.questionType || data.type,
                    options: data.options ? data.options.split('|') : [],
                    correctAnswer: data.correctAnswer || '',
                    bloomsTaxonomy: data.bloomsTaxonomy || 'U',
                    cloMapping: parseInt(data.cloMapping) || 1,
                    internalChoiceGroup: data.internalChoiceGroup || null,
                    createdBy: req.user._id
                });
            })
            .on('end', async () => {
                try {
                    // Apply auto-fill behavior using this user's CHO
                    await autoFillFields(results, req.user._id);

                    // Assign serial numbers
                    const serials = await getNextSerialNumber(results.length);
                    results.forEach((r, i) => { r.serialNumber = serials[i]; });

                    const questions = await Question.insertMany(results);
                    fs.unlinkSync(req.file.path); // Clean up
                    res.json({ message: `${questions.length} questions uploaded`, count: questions.length });
                } catch (insertError) {
                    fs.unlinkSync(req.file.path); // Clean up
                    res.status(400).json({ error: insertError.message });
                }
            })
            .on('error', (parseError) => {
                fs.unlinkSync(req.file.path); // Clean up
                res.status(400).json({ error: parseError.message });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Bulk upload via Word (.docx)
router.post('/upload-word', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await mammoth.extractRawText({ path: req.file.path });
        const rawText = result.value;

        // Parse the structured text
        const questionBlocks = rawText.split('---').map(b => b.trim()).filter(Boolean);
        const questions = [];
        const errors = [];

        questionBlocks.forEach((block, index) => {
            const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
            const fields = {};

            lines.forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim().toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    fields[key] = value;
                }
            });

            // Validate required fields
            if (!fields.question || !fields.subject || !fields.type) {
                errors.push(`Block ${index + 1}: Missing required fields (Question, Subject, Type)`);
                return;
            }

            const questionObj = {
                text: fields.question,
                subject: parseToArray(fields.subject),
                topic: parseToArray(fields.topic),
                unit: fields.unit || '',
                lectureNumber: fields.lecture || fields['lecture number'] || '',
                difficultyLevel: parseInt(fields.difficulty) || 2,
                estimatedTime: parseInt(fields.time) || 5,
                marks: parseInt(fields.marks) || 1,
                questionType: fields.type,
                options: fields.options ? fields.options.split('|').map(o => o.trim()) : [],
                correctAnswer: fields.answer || '',
                bloomsTaxonomy: fields.blooms || 'U',
                cloMapping: parseInt(fields.clo) || 1,
                createdBy: req.user._id
            };

            questions.push(questionObj);
        });

        if (questions.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'No valid questions found in the document.',
                details: errors
            });
        }

        // Apply auto-fill behavior using this user's CHO
        await autoFillFields(questions, req.user._id);

        // Assign serial numbers
        const serials = await getNextSerialNumber(questions.length);
        questions.forEach((q, i) => { q.serialNumber = serials[i]; });

        const inserted = await Question.insertMany(questions);
        fs.unlinkSync(req.file.path);

        res.json({
            message: `${inserted.length} questions uploaded from Word file`,
            count: inserted.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: error.message });
    }
});

// Get stats
router.get('/stats/overview', auth, async (req, res) => {
    try {
        const total = await Question.countDocuments();
        const byDifficulty = await Question.aggregate([
            { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ]);
        const byType = await Question.aggregate([
            { $group: { _id: '$questionType', count: { $sum: 1 } } }
        ]);
        // Unwind subject array for stats
        const bySubject = await Question.aggregate([
            { $unwind: '$subject' },
            { $group: { _id: '$subject', count: { $sum: 1 } } }
        ]);

        res.json({ total, byDifficulty, byType, bySubject });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Smart Question Bank Upload (.docx) — AI-powered via Gemini, fallback to regex parser
router.post('/upload-qbank', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const subject = req.body.subject?.trim();
        if (!subject) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Subject name is required' });
        }

        // Extract raw text from .docx
        const result = await mammoth.extractRawText({ path: req.file.path });
        const rawText = result.value;

        // Lecture range filtering (optional)
        const lectureFrom = parseInt(req.body.lectureFrom) || 0;
        const lectureTo = parseInt(req.body.lectureTo) || 999;
        console.log(`Lecture range: ${lectureFrom || 'start'} to ${lectureTo < 999 ? lectureTo : 'end'}`);

        // Fetch user's CHO mappings for keyword-based topic matching
        let choMappings = [];
        let choTopics = [];
        try {
            const userCHO = await SyllabusMap.findOne({
                subject: new RegExp(`^${subject}$`, 'i'),
                createdBy: req.user._id
            });
            const choDoc = userCHO || await SyllabusMap.findOne({ subject: new RegExp(`^${subject}$`, 'i') });
            if (choDoc) {
                let allMappings = choDoc.mappings || [];

                // Filter by lecture range if provided
                if (lectureFrom > 0 || lectureTo < 999) {
                    allMappings = allMappings.filter(m => {
                        const lectNum = m.lectureNumber || '';
                        // Parse "11-14" → start=11, end=14
                        const parts = String(lectNum).split('-').map(p => parseInt(p.trim()));
                        const start = parts[0] || 0;
                        const end = parts.length > 1 ? (parts[1] || start) : start;
                        // Include if any part of the range overlaps with the requested range
                        return end >= lectureFrom && start <= lectureTo;
                    });
                    console.log(`Filtered CHO: ${allMappings.length}/${choDoc.mappings.length} mappings in lecture range ${lectureFrom}-${lectureTo}`);
                }

                choMappings = allMappings;
                choTopics = [...new Set(choMappings.map(m => m.topic))];
                console.log(`Found CHO with ${choMappings.length} mappings, ${choTopics.length} unique topics:`);
                choTopics.forEach(t => console.log(`  - ${t.substring(0, 60)}`));
            } else {
                console.log('No CHO found for', subject);
            }
        } catch (e) { console.log('CHO fetch error:', e.message); }

        // Try AI parsing via Python service
        let parsed = { questions: [], stats: {}, errors: [], ai_used: false };
        const AI_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

        try {
            const aiRes = await axios.post(`${AI_SERVICE_URL}/parse-qbank`, {
                rawText,
                subject,
                choTopics
            }, { timeout: 90000 }); // 90s timeout for AI
            parsed = aiRes.data;
        } catch (aiError) {
            console.log('AI service call failed:', aiError.message);
        }

        // If AI returned no questions, fall back to regex parser
        if (!parsed.questions || parsed.questions.length === 0) {
            console.log('AI returned 0 questions, falling back to regex parser');
            const regexResult = parseQuestionBank(rawText, subject);
            parsed = { ...regexResult, ai_used: false };
        }

        if (parsed.questions.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'No questions could be extracted from the document.',
                details: parsed.errors
            });
        }

        // Normalize each question to match DB schema
        const questionsToInsert = parsed.questions.map(q => ({
            text: q.text,
            subject: Array.isArray(q.subject) ? q.subject : [subject],
            topic: Array.isArray(q.topic) ? q.topic : (q.topic ? [q.topic] : []),
            unit: q.unit || '',
            lectureNumber: q.lectureNumber || '',
            marks: q.marks || 1,
            questionType: q.questionType || 'MCQ',
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            difficultyLevel: q.difficultyLevel || 2,
            bloomsTaxonomy: 'U',
            cloMapping: q.cloMapping || 1,
            createdBy: req.user._id
        }));

        // Keyword-based Topic Assignment: match questions to CHO topics using keyword overlap
        // First, clear all regex-assigned topics (they come from document headers which can be wrong)
        questionsToInsert.forEach(q => { q.topic = []; });

        if (choMappings.length > 0) {
            try {
                console.log(`Matching ${questionsToInsert.length} questions to ${choMappings.length} CHO topics...`);
                const matches = matchQuestionsToCHO(questionsToInsert, choMappings);
                if (matches) {
                    let assigned = 0;
                    matches.forEach((match, i) => {
                        if (match.topics && match.topics.length > 0) {
                            questionsToInsert[i].topic = match.topics;
                            if (match.unit) questionsToInsert[i].unit = match.unit;
                            assigned++;
                        }
                    });
                    console.log(`Keyword matcher assigned topics to ${assigned}/${questionsToInsert.length} questions`);
                    parsed.ai_used = true; // reuse flag to indicate topics were assigned
                }
            } catch (matchErr) {
                console.log('Keyword matching failed:', matchErr.message);
            }
        } else {
            console.log('No CHO available — topics will be empty. Upload CHO first via Syllabus Maps.');
        }

        // Auto-fill unit/CLO/blooms using user's CHO
        await autoFillFields(questionsToInsert, req.user._id);

        // Assign serial numbers
        const serials = await getNextSerialNumber(questionsToInsert.length);
        questionsToInsert.forEach((q, i) => { q.serialNumber = serials[i]; });

        const inserted = await Question.insertMany(questionsToInsert);
        fs.unlinkSync(req.file.path);

        res.json({
            message: `${inserted.length} questions imported from question bank${parsed.ai_used ? ' (AI-powered)' : ' (regex parser)'}`,
            count: inserted.length,
            stats: parsed.stats,
            ai_used: parsed.ai_used,
            errors: parsed.errors?.length > 0 ? parsed.errors : undefined
        });
    } catch (error) {
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: error.message });
    }
});


// Upload image for a question or MCQ option
router.post('/upload-image', auth, imageUpload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        // Return the relative URL path for the uploaded image
        const imageUrl = `/uploads/question-images/${req.file.filename}`;
        res.json({ imageUrl, filename: req.file.filename });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
