const express = require('express');
const axios = require('axios');
const ExcelJS = require('exceljs');
const Question = require('../models/Question');
const Paper = require('../models/Paper');
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
        const diffLabels = { 1: 'Very Easy', 2: 'Easy', 3: 'Moderate', 4: 'Hard', 5: 'Very Hard' };

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Question Paper Generator';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('summary sheet', {
            properties: { tabColor: { argb: '4472C4' } }
        });

        // --- Styles ---
        const headerFont = { name: 'Calibri', size: 14, bold: true };
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
        ws.getCell('Q4').value = paper.title || '';
        ws.getCell('Q4').font = normalFont;

        // ============================================================
        // ROW 5: Total lectures
        // ============================================================
        ws.getCell('B5').value = 'Total No. of lectures scheduled per week for the course:';
        ws.getCell('B5').font = { name: 'Calibri', size: 9 };
        ws.mergeCells('B5:I5');

        // ============================================================
        // ROW 6: Column Headers for Question Table
        // ============================================================
        const headerRow = 6;
        const headers = {
            A: '', B: 'Question\nnumber', C: 'Lecture\nnumber',
            D: 'Difficulty Level\n1', E: '2', F: '3', G: '4', H: '5',
            I: "Bloom's\nTaxonomy", J: 'CLO\n1', K: 'CLO\n2', L: 'CLO\n3', M: 'CLO\n4', N: 'CLO\n5',
            O: 'Estimated\nTime (min)'
        };

        Object.entries(headers).forEach(([col, text]) => {
            const cell = ws.getCell(`${col}${headerRow}`);
            cell.value = text;
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = headerFill;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBorder;
        });
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

        // Counts for distributions
        const diffCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const bloomCounts = { R: 0, U: 0, P: 0, N: 0, E: 0, C: 0 };
        const cloCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalEstTime = 0;

        sectionOrder.forEach(section => {
            const sectionQuestions = questions.filter(q => sectionMap[q.questionType] === section);
            if (sectionQuestions.length === 0) return;

            sectionQuestions.forEach((q, idx) => {
                qNum++;
                const row = ws.getRow(currentRow);
                const sectionFill = sectionColors[section];

                // A: Section name (merge for first question of section)
                const cellA = ws.getCell(`A${currentRow}`);
                cellA.value = idx === 0 ? section : '';
                cellA.font = boldFont;
                cellA.border = thinBorder;
                cellA.fill = sectionFill;

                // B: Question number with type
                const typeLabel = q.questionType === 'MCQ' ? `${qNum} (MCQ's)` : `${qNum}`;
                ws.getCell(`B${currentRow}`).value = typeLabel;
                ws.getCell(`B${currentRow}`).font = normalFont;
                ws.getCell(`B${currentRow}`).border = thinBorder;
                ws.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };
                ws.getCell(`B${currentRow}`).fill = sectionFill;

                // C: Lecture number
                ws.getCell(`C${currentRow}`).value = q.lectureNumber || '';
                ws.getCell(`C${currentRow}`).font = normalFont;
                ws.getCell(`C${currentRow}`).border = thinBorder;
                ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
                ws.getCell(`C${currentRow}`).fill = sectionFill;

                // D-H: Difficulty level (1-5) - put the marks value in the matching column
                const diff = q.difficultyLevel || 2;
                diffCounts[diff] = (diffCounts[diff] || 0) + (q.marks || 0);
                for (let d = 1; d <= 5; d++) {
                    const colLetter = String.fromCharCode(67 + d); // D=68, E=69...
                    const cell = ws.getCell(`${colLetter}${currentRow}`);
                    cell.value = d === diff ? q.marks : '';
                    cell.font = normalFont;
                    cell.border = thinBorder;
                    cell.alignment = { horizontal: 'center' };
                    cell.fill = sectionFill;
                }

                // I: Bloom's taxonomy
                const bloom = q.bloomsTaxonomy || 'U';
                bloomCounts[bloom] = (bloomCounts[bloom] || 0) + (q.marks || 0);
                ws.getCell(`I${currentRow}`).value = bloom;
                ws.getCell(`I${currentRow}`).font = normalFont;
                ws.getCell(`I${currentRow}`).border = thinBorder;
                ws.getCell(`I${currentRow}`).alignment = { horizontal: 'center' };
                ws.getCell(`I${currentRow}`).fill = sectionFill;

                // J-N: CLO mapping (1-5) - put marks in matching CLO column
                const clo = q.cloMapping || 1;
                cloCounts[clo] = (cloCounts[clo] || 0) + (q.marks || 0);
                for (let c = 1; c <= 5; c++) {
                    const colLetter = String.fromCharCode(73 + c); // J=74, K=75...
                    const cell = ws.getCell(`${colLetter}${currentRow}`);
                    cell.value = c === clo ? q.marks : '';
                    cell.font = normalFont;
                    cell.border = thinBorder;
                    cell.alignment = { horizontal: 'center' };
                    cell.fill = sectionFill;
                }

                // O: Estimated time
                const estTime = q.estimatedTime || 5;
                totalEstTime += estTime;
                ws.getCell(`O${currentRow}`).value = estTime;
                ws.getCell(`O${currentRow}`).font = normalFont;
                ws.getCell(`O${currentRow}`).border = thinBorder;
                ws.getCell(`O${currentRow}`).alignment = { horizontal: 'center' };
                ws.getCell(`O${currentRow}`).fill = sectionFill;

                currentRow++;
            });

            // Merge section name cells
            if (sectionQuestions.length > 1) {
                const startMerge = currentRow - sectionQuestions.length;
                ws.mergeCells(`A${startMerge}:A${currentRow - 1}`);
            }
        });

        const questionsEndRow = currentRow - 1;

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
        // CLO DESCRIPTIONS & % DISTRIBUTION (sidebar)
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

        // CLO rows (numbered 1-5)
        for (let c = 1; c <= 5; c++) {
            const r = cloDescRow + 1 + c;
            ws.getCell(`B${r}`).value = c;
            ws.getCell(`B${r}`).font = boldFont;
            ws.getCell(`B${r}`).border = thinBorder;
            ws.getCell(`B${r}`).alignment = { horizontal: 'center' };
            ws.mergeCells(`C${r}:O${r}`);
            ws.getCell(`C${r}`).value = `CLO-${c} description`;
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
