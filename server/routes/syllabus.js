const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const SyllabusMap = require('../models/SyllabusMap');
const { auth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const AI_SERVICE_URL = process.env.PYTHON_SERVICE_URL || process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

// Get all syllabus maps overview (just subjects, no heavy mappings arrays)
router.get('/', auth, async (req, res) => {
    try {
        // Admin sees all CHOs; regular users see only their own
        const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
        const maps = await SyllabusMap.find(filter, 'subject createdAt updatedAt createdBy')
            .populate('createdBy', 'name memberId role');
        res.json(maps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get syllabus map for a specific subject — user's own first, fallback to any
router.get('/:subject', auth, async (req, res) => {
    try {
        const subject = req.params.subject.trim();
        // Try to find user's own CHO first
        let map = await SyllabusMap.findOne({
            subject: new RegExp(`^${subject}$`, 'i'),
            createdBy: req.user._id
        });
        // Fallback: if admin or no own map found, find any map for the subject
        if (!map) {
            map = await SyllabusMap.findOne({ subject: new RegExp(`^${subject}$`, 'i') });
        }
        if (!map) {
            return res.status(404).json({ error: 'Syllabus map not found for this subject' });
        }
        res.json(map);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload a CHO (Course Handout) file — auto-parses via Python AI service
router.post('/upload-cho', auth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Send the file to the Python AI service for parsing
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/parse-cho`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000
        });

        const parsed = aiResponse.data;

        if (!parsed.subject || parsed.subject === 'Unknown Subject') {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'Could not detect subject name from the CHO document.',
                parsed
            });
        }

        if (!parsed.mappings || parsed.mappings.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                error: 'Could not extract any topic mappings from the CHO document.',
                parsed
            });
        }

        // Override subject if user provided one
        const subject = req.body.subject?.trim() || parsed.subject;

        // Convert parsed mappings to our database format
        const mappings = parsed.mappings.map(m => ({
            topic: m.topic,
            unit: m.unit,
            lectureNumber: m.lectureNumber,
            cloMapping: m.cloMapping || 1
        }));

        // Upsert scoped to THIS USER — each user gets their own CHO per subject
        let map = await SyllabusMap.findOne({
            subject: new RegExp(`^${subject}$`, 'i'),
            createdBy: req.user._id
        });
        if (map) {
            map.mappings = mappings;
            map.subject = subject; // Update case if needed
        } else {
            map = new SyllabusMap({
                subject,
                mappings,
                createdBy: req.user._id
            });
        }

        await map.save();
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            message: `CHO parsed and syllabus map created for "${subject}"`,
            subject,
            topicsCount: mappings.length,
            cloDefinitions: parsed.clo_definitions,
            map
        });
    } catch (error) {
        try { fs.unlinkSync(req.file.path); } catch(e) {}
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'Python AI Service is not running. Please start it with: python app.py' 
            });
        }
        res.status(500).json({ error: error.response?.data?.error || error.message });
    }
});

// Upload a CSV Syllabus Map for a Specific Subject
router.post('/upload-csv', auth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const subject = req.body.subject?.trim();
    if (!subject) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Subject is required' });
    }

    const mappings = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            const cleanData = {};
            for (const [key, value] of Object.entries(data)) {
                cleanData[key.trim().toLowerCase()] = typeof value === 'string' ? value.trim() : value;
            }

            const topic = cleanData.topic || cleanData['topic name'] || cleanData.topics;
            const unit = cleanData.unit || cleanData.chapter;
            
            if (!topic || !unit) {
                return;
            }

            mappings.push({
                topic,
                unit,
                lectureNumber: cleanData.lecturenumber || cleanData.lecture || cleanData.lectures || '',
                cloMapping: parseInt(cleanData.clomapping || cleanData.clo) || 1
            });
        })
        .on('end', async () => {
            try {
                if (mappings.length === 0) {
                    fs.unlinkSync(req.file.path);
                    return res.status(400).json({ error: 'No valid syllabus mappings found in CSV' });
                }

                // Upsert scoped to THIS USER
                let map = await SyllabusMap.findOne({
                    subject: new RegExp(`^${subject}$`, 'i'),
                    createdBy: req.user._id
                });
                if (map) {
                    map.mappings = mappings;
                    map.subject = subject;
                } else {
                    map = new SyllabusMap({
                        subject,
                        mappings,
                        createdBy: req.user._id
                    });
                }

                await map.save();
                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `Syllabus map uploaded successfully for ${subject}`,
                    topicsCount: mappings.length,
                    map
                });
            } catch (error) {
                fs.unlinkSync(req.file.path);
                res.status(500).json({ error: error.message });
            }
        })
        .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ error: error.message });
        });
});

// Delete syllabus map — only owner or admin can delete
router.delete('/:id', auth, async (req, res) => {
    try {
        const map = await SyllabusMap.findById(req.params.id);
        if (!map) {
            return res.status(404).json({ error: 'Syllabus map not found' });
        }
        // Only the owner or admin can delete
        if (map.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own syllabus maps' });
        }
        await SyllabusMap.findByIdAndDelete(req.params.id);
        res.json({ message: 'Syllabus map deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
