const express = require('express');
const axios = require('axios');
const ExcelJS = require('exceljs');
const Question = require('../models/Question');
const Paper = require('../models/Paper');
const SyllabusMap = require('../models/SyllabusMap');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate paper
router.post('/generate', auth, async (req, res) => {
    try {
        const {
            // University/Institution Details
            universityName,
            logoPath,
            academicYear,

            // Exam Details
            title,
            semester,

            // Course Details
            programmeName,
            courseTitle,
            courseCode,
            subject,

            // Paper Configuration
            totalMarks,
            duration,
            totalPages,
            instructions,
            difficultyDistribution,
            questionTypes,
            questionCounts, // NEW: Exact counts per question type
            unitConfig // Array of { name, topics, percentage }
        } = req.body;

        // Fetch questions from DB based on subject and question types
        const filter = { subject: { $in: [new RegExp(subject, 'i')] } };
        if (questionTypes && questionTypes.length > 0) {
            filter.questionType = { $in: questionTypes };
        }

        const availableQuestions = await Question.find(filter);

        if (availableQuestions.length === 0) {
            return res.status(400).json({ error: 'No questions available for the given criteria' });
        }

        let selectedQuestions = [];
        let analytics = {};

        // Try Python service first, fallback to Node.js selection
        try {
            const pythonResponse = await axios.post(`${process.env.PYTHON_SERVICE_URL}/generate`, {
                questions: availableQuestions,
                config: {
                    totalMarks,
                    difficultyDistribution: difficultyDistribution || { 1: 20, 2: 30, 3: 30, 4: 15, 5: 5 },
                    questionTypes: questionTypes || ['MCQ', '3 Mark', '5 Mark'],
                    questionCounts: questionCounts || {},
                    unitConfig: unitConfig || []
                }
            }, { timeout: 15000 });

            selectedQuestions = pythonResponse.data.selected_questions;
            analytics = pythonResponse.data.analytics || {};
        } catch (pyErr) {
            console.log('Python service unavailable, using Node.js fallback:', pyErr.message);

            // Node.js fallback: select questions by type and count
            const counts = questionCounts || {};
            const questionsArr = availableQuestions.map(q => q.toObject());

            // Group questions by type
            const byType = {};
            questionsArr.forEach(q => {
                const type = q.questionType || 'MCQ';
                if (!byType[type]) byType[type] = [];
                byType[type].push(q);
            });

            // Shuffle helper
            const shuffle = (arr) => {
                const a = [...arr];
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
                return a;
            };

            // Select the required number of each type
            for (const [type, count] of Object.entries(counts)) {
                if (count <= 0) continue;
                const pool = byType[type] || [];
                const shuffled = shuffle(pool);
                const selected = shuffled.slice(0, count);
                selectedQuestions.push(...selected);
            }

            // If no specific counts, just select randomly up to totalMarks
            if (selectedQuestions.length === 0) {
                const shuffled = shuffle(questionsArr);
                let currentMarks = 0;
                for (const q of shuffled) {
                    if (currentMarks + (q.marks || 1) <= (totalMarks || 40)) {
                        selectedQuestions.push(q);
                        currentMarks += (q.marks || 1);
                    }
                }
            }

            analytics = {
                method: 'node-fallback',
                totalSelected: selectedQuestions.length,
                byType: {}
            };
            selectedQuestions.forEach(q => {
                const t = q.questionType || 'MCQ';
                analytics.byType[t] = (analytics.byType[t] || 0) + 1;
            });
        }

        const questionIds = selectedQuestions.map(q => q._id);

        // Save paper to database with all new fields
        const paper = new Paper({
            // University/Institution Details
            universityName: universityName || 'University Name',
            logoPath: logoPath || null,
            academicYear: academicYear || '2025-2026',

            // Exam Details
            title,
            semester: semester || '',

            // Course Details
            programmeName: programmeName || '',
            courseTitle: courseTitle || subject,
            courseCode: courseCode || '',
            subject,

            // Paper Configuration
            totalMarks,
            duration: duration || 180,
            totalPages: totalPages || 2,
            instructions: instructions || [
                'Follow the instructions given in each section.',
                'Do not write anything on the question paper, except your roll no.',
                'Make sure that you attempt the questions in order.'
            ],
            config: {
                difficultyDistribution: difficultyDistribution || { Easy: 30, Medium: 50, Hard: 20 },
                questionTypes: questionTypes || ['MCQ', '2 Mark', '5 Mark', '10 Mark']
            },
            questions: questionIds,
            createdBy: req.user._id
        });

        await paper.save();

        res.json({
            message: 'Paper generated successfully',
            paper: {
                ...paper.toObject(),
                questionsData: selectedQuestions
            },
            analytics
        });
    } catch (error) {
        console.error('Paper generation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get all papers
router.get('/', auth, async (req, res) => {
    try {
        // Admin sees all papers; regular users see only their own
        const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
        const papers = await Paper.find(filter)
            .populate('questions')
            .populate('createdBy', 'name memberId')
            .sort({ createdAt: -1 });
        res.json(papers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single paper
router.get('/:id', auth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).populate('questions');
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json(paper);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate PDF
router.post('/:id/pdf', auth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).populate('questions');
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }

        // Call Python service for PDF generation
        const pythonResponse = await axios.post(
            `${process.env.PYTHON_SERVICE_URL}/create-pdf`,
            {
                paper: paper.toObject(),
                type: req.body.type || 'question_paper' // 'question_paper' or 'summary'
            },
            { responseType: 'arraybuffer' }
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${paper.title.replace(/\s/g, '_')}.pdf"`
        });
        res.send(pythonResponse.data);
    } catch (error) {
        console.error('PDF generation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Generate Summary Excel (matching Revision Summary Sheet format)
router.post('/:id/summary-excel', auth, async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).populate('questions');
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }

        const questions = paper.questions || [];

        // Fetch CLO definitions from the SyllabusMap (CHO) for this paper's subject
        let cloDefinitions = {};
        try {
            const syllabusMap = await SyllabusMap.findOne({
                subject: new RegExp(`^${paper.subject}$`, 'i')
            });
            if (syllabusMap && syllabusMap.cloDefinitions) {
                // Convert Mongoose Map to plain object
                cloDefinitions = syllabusMap.cloDefinitions instanceof Map
                    ? Object.fromEntries(syllabusMap.cloDefinitions)
                    : syllabusMap.cloDefinitions;
            }
        } catch (e) {
            console.log('Could not fetch CLO definitions:', e.message);
        }

        // Group questions by section
        const sectionMap = {
            'MCQ': 'SECTION-A',
            '2 Mark': 'SECTION-B',
            '3 Mark': 'SECTION-B',
            '5 Mark': 'SECTION-C',
            '10 Mark': 'SECTION-C'
        };

        // Calculate total marks from actual questions
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

        // Bloom's taxonomy labels
        const bloomLabels = {
            R: 'Remembering', U: 'Understanding', P: 'Applying',
            N: 'Analyzing', E: 'Evaluating', C: 'Creating'
        };
        const bloomMethods = {
            R: 'List, Relate, Show, Locate, Distinguish, Give example, Reproduce, Quote, Recall, Identify, Recognize, Select',
            U: 'Restate, identify, retell, research, annotate, translate, rewrite, discuss, describe, explain, review',
            P: 'Translate, Manipulate, Exhibit, Calculate, Interpret, Make, Use, Diagram, Perform, Practice, Apply',
            N: 'Distinguish, question, appraise, experiment, inspect, examine, probe, separate, inquire, arrange, investigate',
            E: 'Judge, Rate, Validate, Predict, Assess, score, infer, determine, prioritize, tell why, evaluate',
            C: 'Compose, Assemble, Organize, Invent, compile, forecast, devise, construct, plan, integrate, design'
        };

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Question Paper Generator';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('summary sheet', {
            properties: { tabColor: { argb: '4472C4' } }
        });

        // --- Styles ---
        const normalFont = { name: 'Calibri', size: 11 };
        const boldFont = { name: 'Calibri', size: 11, bold: true };
        const thinBorder = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
        };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
        const lightBlueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6E4F0' } };
        const lightGreenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
        const lightYellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };

        // Set column widths (A-R = 18 columns)
        const colWidths = [12, 12, 14, 6, 6, 6, 6, 6, 8, 6, 6, 6, 6, 6, 12, 3, 20, 16];
        colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

        // ============================================================
        // ROW 1: Title
        // ============================================================
        ws.mergeCells('B1:R1');
        const titleCell = ws.getCell('B1');
        titleCell.value = 'Summary Sheet';
        titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.fill = headerFill;
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 35;

        // ============================================================
        // ROW 2: Academic Year & Semester
        // ============================================================
        ws.mergeCells('B2:C2');
        ws.getCell('B2').value = 'Academic Year:';
        ws.getCell('B2').font = boldFont;
        ws.mergeCells('D2:H2');
        ws.getCell('D2').value = paper.academicYear || '2025-26';
        ws.getCell('D2').font = normalFont;
        ws.mergeCells('J2:N2');
        ws.getCell('J2').value = 'Semester:';
        ws.getCell('J2').font = boldFont;
        ws.getCell('O2').value = paper.semester || '';
        ws.getCell('O2').font = normalFont;

        // ============================================================
        // ROW 3: Programme Name & Course Code
        // ============================================================
        ws.mergeCells('B3:C3');
        ws.getCell('B3').value = 'Program Name:';
        ws.getCell('B3').font = boldFont;
        ws.mergeCells('D3:O3');
        ws.getCell('D3').value = paper.programmeName || '';
        ws.getCell('D3').font = normalFont;
        ws.getCell('Q3').value = 'Course Code:';
        ws.getCell('Q3').font = boldFont;
        ws.getCell('R3').value = paper.courseCode || '';
        ws.getCell('R3').font = normalFont;

        // ============================================================
        // ROW 4: Course Title & ST info
        // ============================================================
        ws.mergeCells('B4:C4');
        ws.getCell('B4').value = 'Title of the course:';
        ws.getCell('B4').font = boldFont;
        ws.mergeCells('D4:O4');
        ws.getCell('D4').value = paper.courseTitle || paper.subject || '';
        ws.getCell('D4').font = normalFont;
        ws.getCell('Q4').value = `ST: ${(paper.title || '').replace(/sessional\s*test\s*-?\s*/i, '')}`;
        ws.getCell('Q4').font = boldFont;

        // ============================================================
        // ROW 5: Total lectures
        // ============================================================
        ws.getCell('B5').value = 'Total No. of lectures scheduled per week for the course:';
        ws.getCell('B5').font = { name: 'Calibri', size: 9 };
        ws.mergeCells('B5:I5');

        // ============================================================
        // ROW 6: Column Headers for Question Table
        // (Matching reference: D6:H6 merged, J6:N6 merged)
        // ============================================================
        const headerRow = 6;
        const headerStyle = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFF' } };
        const headerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Individual header cells
        const simpleHeaders = { A: '', B: 'Question number', O: 'Estimated time required (in minutes) to solve the question paper by\nAverage student' };
        Object.entries(simpleHeaders).forEach(([col, text]) => {
            const cell = ws.getCell(`${col}${headerRow}`);
            cell.value = text;
            cell.font = headerStyle;
            cell.fill = headerFill;
            cell.alignment = headerAlign;
            cell.border = thinBorder;
        });

        // C: Lecture number header
        ws.getCell(`C${headerRow}`).value = 'Lecture number\nof the topics in the Course Handout (Annexure C)';
        ws.getCell(`C${headerRow}`).font = headerStyle;
        ws.getCell(`C${headerRow}`).fill = headerFill;
        ws.getCell(`C${headerRow}`).alignment = headerAlign;
        ws.getCell(`C${headerRow}`).border = thinBorder;

        // D6:H6 merged: Difficulty header
        ws.mergeCells('D6:H6');
        ws.getCell('D6').value = 'Level of difficulty on a scale of 1 (very easy) to 5 (extremely difficult)';
        ws.getCell('D6').font = headerStyle;
        ws.getCell('D6').fill = headerFill;
        ws.getCell('D6').alignment = headerAlign;
        ws.getCell('D6').border = thinBorder;

        // I: Bloom's header
        ws.getCell(`I${headerRow}`).value = "Indicative letter of Bloom\u2019s taxonomy (refer to table below)";
        ws.getCell(`I${headerRow}`).font = headerStyle;
        ws.getCell(`I${headerRow}`).fill = headerFill;
        ws.getCell(`I${headerRow}`).alignment = headerAlign;
        ws.getCell(`I${headerRow}`).border = thinBorder;

        // J6:N6 merged: CLO header
        ws.mergeCells('J6:N6');
        ws.getCell('J6').value = 'Please indicate the level of CLO, this question best matches to';
        ws.getCell('J6').font = headerStyle;
        ws.getCell('J6').fill = headerFill;
        ws.getCell('J6').alignment = headerAlign;
        ws.getCell('J6').border = thinBorder;

        // Q6:R10 merged: Sequence of lecture nos header (right sidebar area)
        ws.mergeCells('Q6:R10');
        ws.getCell('Q6').value = 'Sequence of lecture nos. (in ascending order)\nfrom where the questions have been framed';
        ws.getCell('Q6').font = headerStyle;
        ws.getCell('Q6').fill = headerFill;
        ws.getCell('Q6').alignment = headerAlign;
        ws.getCell('Q6').border = thinBorder;

        ws.getRow(headerRow).height = 45;

        // ============================================================
        // QUESTION ROWS (starting row 7)
        // ============================================================
        let currentRow = headerRow + 1;
        let qNum = 0;
        const sectionOrder = ['SECTION-A', 'SECTION-B', 'SECTION-C'];
        const sectionColors = {
            'SECTION-A': lightGreenFill,
            'SECTION-B': lightBlueFill,
            'SECTION-C': lightYellowFill
        };

        // Counts for percentage distributions
        const diffCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const cloCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalEstTime = 0;

        // Helper: apply cell styling for a question row
        const styleCell = (cellRef, value, fill) => {
            const cell = ws.getCell(cellRef);
            cell.value = value;
            cell.font = normalFont;
            cell.border = thinBorder;
            cell.alignment = { horizontal: 'center' };
            cell.fill = fill;
            return cell;
        };

        sectionOrder.forEach(section => {
            const sectionQuestions = questions.filter(q => sectionMap[q.questionType] === section);
            if (sectionQuestions.length === 0) return;

            const sectionFill = sectionColors[section];
            const sectionStartRow = currentRow;

            if (section === 'SECTION-A') {
                // ====================================================
                // MCQs: Group 5 per row (matching reference format)
                // ====================================================
                qNum++;
                const mcqQuestionNumber = qNum; // This is question "1 (MCQ's)"

                // Gather all lecture numbers from MCQs for a combined range
                const mcqLectures = sectionQuestions
                    .map(q => q.lectureNumber || '')
                    .filter(l => l !== '');
                const combinedLecture = mcqLectures.length > 0 ? mcqLectures.join(', ') : '';

                // Calculate total MCQ estimated time
                const mcqTotalTime = sectionQuestions.reduce((sum, q) => sum + (q.estimatedTime || 1), 0);
                totalEstTime += mcqTotalTime;

                // Track difficulty and CLO counts for MCQs
                sectionQuestions.forEach(q => {
                    const diff = q.difficultyLevel || 2;
                    diffCounts[diff] = (diffCounts[diff] || 0) + (q.marks || 1);
                    const clo = q.cloMapping || 1;
                    cloCounts[clo] = (cloCounts[clo] || 0) + (q.marks || 1);
                });

                // Group MCQs 5 per row
                const mcqRowCount = Math.ceil(sectionQuestions.length / 5);
                for (let rowIdx = 0; rowIdx < mcqRowCount; rowIdx++) {
                    const startMcq = rowIdx * 5;
                    const rowMcqs = sectionQuestions.slice(startMcq, startMcq + 5);

                    // A: Section name (only on first row)
                    const cellA = ws.getCell(`A${currentRow}`);
                    cellA.value = rowIdx === 0 ? section : '';
                    cellA.font = boldFont;
                    cellA.border = thinBorder;
                    cellA.fill = sectionFill;

                    // B: Question number (only on first row)
                    const cellB = ws.getCell(`B${currentRow}`);
                    cellB.value = rowIdx === 0 ? `${mcqQuestionNumber} (MCQ's)` : '';
                    cellB.font = normalFont;
                    cellB.border = thinBorder;
                    cellB.alignment = { horizontal: 'center' };
                    cellB.fill = sectionFill;

                    // C: Lecture number (only on first row)
                    const cellC = ws.getCell(`C${currentRow}`);
                    cellC.value = rowIdx === 0 ? combinedLecture : '';
                    cellC.font = normalFont;
                    cellC.border = thinBorder;
                    cellC.alignment = { horizontal: 'center' };
                    cellC.fill = sectionFill;

                    // D-H: Individual MCQ difficulty values (one per column)
                    for (let col = 0; col < 5; col++) {
                        const colLetter = String.fromCharCode(68 + col); // D=68, E=69, F=70, G=71, H=72
                        const cell = ws.getCell(`${colLetter}${currentRow}`);
                        if (col < rowMcqs.length) {
                            cell.value = rowMcqs[col].difficultyLevel || 2;
                        } else {
                            cell.value = '';
                        }
                        cell.font = normalFont;
                        cell.border = thinBorder;
                        cell.alignment = { horizontal: 'center' };
                        cell.fill = sectionFill;
                    }

                    // I: Bloom's taxonomy (only on first row)
                    const cellI = ws.getCell(`I${currentRow}`);
                    cellI.value = rowIdx === 0 ? (rowMcqs[0]?.bloomsTaxonomy || 'U') : '';
                    cellI.font = normalFont;
                    cellI.border = thinBorder;
                    cellI.alignment = { horizontal: 'center' };
                    cellI.fill = sectionFill;

                    // J-N: Individual MCQ CLO values (one per column)
                    for (let col = 0; col < 5; col++) {
                        const colLetter = String.fromCharCode(74 + col); // J=74, K=75, L=76, M=77, N=78
                        const cell = ws.getCell(`${colLetter}${currentRow}`);
                        if (col < rowMcqs.length) {
                            cell.value = rowMcqs[col].cloMapping || 1;
                        } else {
                            cell.value = '';
                        }
                        cell.font = normalFont;
                        cell.border = thinBorder;
                        cell.alignment = { horizontal: 'center' };
                        cell.fill = sectionFill;
                    }

                    // O: Estimated time (only on first row, total for all MCQs)
                    const cellO = ws.getCell(`O${currentRow}`);
                    cellO.value = rowIdx === 0 ? mcqTotalTime : '';
                    cellO.font = normalFont;
                    cellO.border = thinBorder;
                    cellO.alignment = { horizontal: 'center' };
                    cellO.fill = sectionFill;

                    currentRow++;
                }

                // Merge MCQ cells across rows (matching reference: B, C, I, O merged)
                if (mcqRowCount > 1) {
                    ws.mergeCells(`A${sectionStartRow}:A${currentRow - 1}`);
                    ws.mergeCells(`B${sectionStartRow}:B${currentRow - 1}`);
                    ws.mergeCells(`C${sectionStartRow}:C${currentRow - 1}`);
                    ws.mergeCells(`I${sectionStartRow}:I${currentRow - 1}`);
                    ws.mergeCells(`O${sectionStartRow}:O${currentRow - 1}`);
                }

            } else {
                // ====================================================
                // Non-MCQ sections: One question per row
                // ====================================================
                sectionQuestions.forEach((q, idx) => {
                    qNum++;

                    // A: Section name (only on first question of section)
                    const cellA = ws.getCell(`A${currentRow}`);
                    cellA.value = idx === 0 ? section : '';
                    cellA.font = boldFont;
                    cellA.border = thinBorder;
                    cellA.fill = sectionFill;

                    // B: Question number
                    styleCell(`B${currentRow}`, `${qNum}`, sectionFill);

                    // C: Lecture number from the question
                    styleCell(`C${currentRow}`, q.lectureNumber || '', sectionFill);

                    // D-H: Merge and put difficulty NUMBER (matching reference)
                    const diff = q.difficultyLevel || 2;
                    diffCounts[diff] = (diffCounts[diff] || 0) + (q.marks || 0);
                    ws.mergeCells(`D${currentRow}:H${currentRow}`);
                    styleCell(`D${currentRow}`, diff, sectionFill);

                    // I: Bloom's taxonomy letter
                    const bloom = q.bloomsTaxonomy || 'U';
                    styleCell(`I${currentRow}`, bloom, sectionFill);

                    // J-N: Merge and put CLO NUMBER (matching reference)
                    const clo = q.cloMapping || 1;
                    cloCounts[clo] = (cloCounts[clo] || 0) + (q.marks || 0);
                    ws.mergeCells(`J${currentRow}:N${currentRow}`);
                    styleCell(`J${currentRow}`, clo, sectionFill);

                    // O: Estimated time from DB
                    const estTime = q.estimatedTime || 5;
                    totalEstTime += estTime;
                    styleCell(`O${currentRow}`, estTime, sectionFill);

                    currentRow++;
                });

                // Merge section name cells
                if (sectionQuestions.length > 1) {
                    ws.mergeCells(`A${sectionStartRow}:A${currentRow - 1}`);
                }
            }
        });

        // ============================================================
        // TOTAL ESTIMATED TIME ROW
        // ============================================================
        const timeRow = currentRow + 1;
        ws.mergeCells(`B${timeRow}:N${timeRow + 1}`);
        ws.getCell(`B${timeRow}`).value = `Total estimated time required to solve the question paper as per the assessment: ${totalEstTime} minutes`;
        ws.getCell(`B${timeRow}`).font = boldFont;
        ws.getCell(`B${timeRow}`).alignment = { wrapText: true, vertical: 'middle' };
        ws.getCell(`B${timeRow}`).border = thinBorder;
        ws.getCell(`O${timeRow}`).value = totalEstTime;
        ws.getCell(`O${timeRow}`).font = { name: 'Calibri', size: 14, bold: true };
        ws.getCell(`O${timeRow}`).border = thinBorder;
        ws.getCell(`O${timeRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

        // ============================================================
        // DIFFICULTY % DISTRIBUTION SIDEBAR (right side, starting at row 12)
        // ============================================================
        const diffStartRow = headerRow + 6;
        ws.getCell(`Q${diffStartRow}`).value = 'Percentage distribution for level of difficulty';
        ws.getCell(`Q${diffStartRow}`).font = boldFont;
        ws.mergeCells(`Q${diffStartRow}:R${diffStartRow + 1}`);
        ws.getCell(`Q${diffStartRow}`).alignment = { wrapText: true, vertical: 'middle' };

        ws.getCell(`Q${diffStartRow + 2}`).value = 'Level of\ndifficulty';
        ws.getCell(`Q${diffStartRow + 2}`).font = boldFont;
        ws.getCell(`Q${diffStartRow + 2}`).alignment = { wrapText: true, horizontal: 'center' };
        ws.getCell(`Q${diffStartRow + 2}`).border = thinBorder;
        ws.getCell(`R${diffStartRow + 2}`).value = 'Corresponding\n% in the paper';
        ws.getCell(`R${diffStartRow + 2}`).font = boldFont;
        ws.getCell(`R${diffStartRow + 2}`).alignment = { wrapText: true, horizontal: 'center' };
        ws.getCell(`R${diffStartRow + 2}`).border = thinBorder;

        for (let d = 1; d <= 5; d++) {
            const r = diffStartRow + 2 + d;
            ws.getCell(`Q${r}`).value = d;
            ws.getCell(`Q${r}`).font = normalFont;
            ws.getCell(`Q${r}`).border = thinBorder;
            ws.getCell(`Q${r}`).alignment = { horizontal: 'center' };
            const pct = totalMarks > 0 ? ((diffCounts[d] / totalMarks) * 100).toFixed(1) : '0.0';
            ws.getCell(`R${r}`).value = parseFloat(pct);
            ws.getCell(`R${r}`).font = normalFont;
            ws.getCell(`R${r}`).border = thinBorder;
            ws.getCell(`R${r}`).alignment = { horizontal: 'center' };
            ws.getCell(`R${r}`).numFmt = '0.0';
        }
        const diffTotalRow = diffStartRow + 8;
        ws.getCell(`Q${diffTotalRow}`).value = 'Total';
        ws.getCell(`Q${diffTotalRow}`).font = boldFont;
        ws.getCell(`Q${diffTotalRow}`).border = thinBorder;
        ws.getCell(`R${diffTotalRow}`).value = 100;
        ws.getCell(`R${diffTotalRow}`).font = boldFont;
        ws.getCell(`R${diffTotalRow}`).border = thinBorder;
        ws.getCell(`R${diffTotalRow}`).alignment = { horizontal: 'center' };

        // ============================================================
        // CLO % DISTRIBUTION SIDEBAR
        // ============================================================
        const cloSidebarRow = diffTotalRow + 2;
        ws.getCell(`Q${cloSidebarRow}`).value = 'Percentage distribution pertaining to different CLOs';
        ws.getCell(`Q${cloSidebarRow}`).font = boldFont;
        ws.mergeCells(`Q${cloSidebarRow}:R${cloSidebarRow + 1}`);
        ws.getCell(`Q${cloSidebarRow}`).alignment = { wrapText: true, vertical: 'middle' };

        ws.getCell(`Q${cloSidebarRow + 2}`).value = 'CLOs';
        ws.getCell(`Q${cloSidebarRow + 2}`).font = boldFont;
        ws.getCell(`Q${cloSidebarRow + 2}`).border = thinBorder;
        ws.getCell(`Q${cloSidebarRow + 2}`).alignment = { horizontal: 'center' };
        ws.getCell(`R${cloSidebarRow + 2}`).value = 'Corresponding\n% in the paper';
        ws.getCell(`R${cloSidebarRow + 2}`).font = boldFont;
        ws.getCell(`R${cloSidebarRow + 2}`).border = thinBorder;
        ws.getCell(`R${cloSidebarRow + 2}`).alignment = { wrapText: true, horizontal: 'center' };

        for (let c = 1; c <= 5; c++) {
            const r = cloSidebarRow + 2 + c;
            ws.getCell(`Q${r}`).value = `CLO-${c}`;
            ws.getCell(`Q${r}`).font = normalFont;
            ws.getCell(`Q${r}`).border = thinBorder;
            ws.getCell(`Q${r}`).alignment = { horizontal: 'center' };
            const pct = totalMarks > 0 ? ((cloCounts[c] / totalMarks) * 100).toFixed(1) : '0.0';
            ws.getCell(`R${r}`).value = parseFloat(pct);
            ws.getCell(`R${r}`).font = normalFont;
            ws.getCell(`R${r}`).border = thinBorder;
            ws.getCell(`R${r}`).alignment = { horizontal: 'center' };
            ws.getCell(`R${r}`).numFmt = '0.0';
        }
        const cloTotalRow = cloSidebarRow + 8;
        ws.getCell(`Q${cloTotalRow}`).value = 'Total';
        ws.getCell(`Q${cloTotalRow}`).font = boldFont;
        ws.getCell(`Q${cloTotalRow}`).border = thinBorder;
        ws.getCell(`R${cloTotalRow}`).value = 100;
        ws.getCell(`R${cloTotalRow}`).font = boldFont;
        ws.getCell(`R${cloTotalRow}`).border = thinBorder;
        ws.getCell(`R${cloTotalRow}`).alignment = { horizontal: 'center' };

        // ============================================================
        // CLO DESCRIPTIONS (below time row, left side)
        // ============================================================
        const cloDescRow = timeRow + 3;
        ws.mergeCells(`B${cloDescRow}:O${cloDescRow + 1}`);
        ws.getCell(`B${cloDescRow}`).value = 'Please bring forth all the CLOs identified for the course (you can copy them from the course plan)';
        ws.getCell(`B${cloDescRow}`).font = { name: 'Calibri', size: 10, italic: true };
        ws.getCell(`B${cloDescRow}`).alignment = { wrapText: true, vertical: 'middle' };

        // CLO rows (numbered 1-5, using real descriptions from CHO if available)
        for (let c = 1; c <= 5; c++) {
            const r = cloDescRow + 1 + c;
            ws.getCell(`B${r}`).value = c;
            ws.getCell(`B${r}`).font = boldFont;
            ws.getCell(`B${r}`).border = thinBorder;
            ws.getCell(`B${r}`).alignment = { horizontal: 'center' };
            ws.mergeCells(`C${r}:O${r}`);
            const cloKey = `CLO${String(c).padStart(2, '0')}`;
            const cloDesc = cloDefinitions[cloKey] || `CLO-${c} description`;
            ws.getCell(`C${r}`).value = cloDesc;
            ws.getCell(`C${r}`).font = normalFont;
            ws.getCell(`C${r}`).border = thinBorder;
        }

        // ============================================================
        // BLOOM'S TAXONOMY REFERENCE TABLE
        // ============================================================
        const bloomRefRow = cloDescRow + 8;

        // Headers
        ws.getCell(`B${bloomRefRow}`).value = 'Indicative letter';
        ws.getCell(`B${bloomRefRow}`).font = boldFont;
        ws.getCell(`B${bloomRefRow}`).border = thinBorder;
        ws.mergeCells(`C${bloomRefRow}:F${bloomRefRow}`);
        ws.getCell(`C${bloomRefRow}`).value = 'Focus of learning';
        ws.getCell(`C${bloomRefRow}`).font = boldFont;
        ws.getCell(`C${bloomRefRow}`).border = thinBorder;
        ws.mergeCells(`G${bloomRefRow}:R${bloomRefRow}`);
        ws.getCell(`G${bloomRefRow}`).value = 'Methods of learning';
        ws.getCell(`G${bloomRefRow}`).font = boldFont;
        ws.getCell(`G${bloomRefRow}`).border = thinBorder;

        // Bloom's rows
        const bloomOrder = ['R', 'U', 'P', 'N', 'E', 'C'];
        bloomOrder.forEach((code, idx) => {
            const r = bloomRefRow + 1 + idx;
            ws.getCell(`B${r}`).value = code;
            ws.getCell(`B${r}`).font = boldFont;
            ws.getCell(`B${r}`).border = thinBorder;
            ws.getCell(`B${r}`).alignment = { horizontal: 'center' };

            ws.mergeCells(`C${r}:F${r}`);
            ws.getCell(`C${r}`).value = bloomLabels[code];
            ws.getCell(`C${r}`).font = normalFont;
            ws.getCell(`C${r}`).border = thinBorder;

            ws.mergeCells(`G${r}:R${r}`);
            ws.getCell(`G${r}`).value = bloomMethods[code];
            ws.getCell(`G${r}`).font = { name: 'Calibri', size: 9 };
            ws.getCell(`G${r}`).border = thinBorder;
            ws.getCell(`G${r}`).alignment = { wrapText: true };
        });

        // ============================================================
        // PAPER SETTER DETAILS
        // ============================================================
        const setterRow = bloomRefRow + 9;
        ws.getCell(`B${setterRow}`).value = 'Name of Paper Setter:';
        ws.getCell(`B${setterRow}`).font = boldFont;
        ws.mergeCells(`D${setterRow}:H${setterRow}`);
        ws.getCell(`D${setterRow}`).value = '';
        ws.getCell(`D${setterRow}`).border = { bottom: { style: 'thin' } };
        ws.getCell(`O${setterRow}`).value = 'Designation:';
        ws.getCell(`O${setterRow}`).font = boldFont;
        ws.mergeCells(`P${setterRow}:R${setterRow}`);

        ws.getCell(`B${setterRow + 1}`).value = 'Department:';
        ws.getCell(`B${setterRow + 1}`).font = boldFont;
        ws.mergeCells(`D${setterRow + 1}:H${setterRow + 1}`);
        ws.getCell(`D${setterRow + 1}`).border = { bottom: { style: 'thin' } };
        ws.getCell(`O${setterRow + 1}`).value = 'Signature:';
        ws.getCell(`O${setterRow + 1}`).font = boldFont;

        ws.getCell(`O${setterRow + 2}`).value = 'Date:';
        ws.getCell(`O${setterRow + 2}`).font = boldFont;

        // Generate buffer and send
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `${(paper.title || 'Summary').replace(/\s/g, '_')}_Summary_Sheet.xlsx`;

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length
        });
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Excel summary generation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete paper
router.delete('/:id', auth, async (req, res) => {
    try {
        const paper = await Paper.findByIdAndDelete(req.params.id);
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        res.json({ message: 'Paper deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
