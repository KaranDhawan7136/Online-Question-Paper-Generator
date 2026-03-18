const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
const Question = require('./models/Question');

// Use 127.0.0.1 to avoid IPv6 issues
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/question_paper_db';

async function generateReport() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const questions = await Question.find().sort({ subject: 1, questionType: 1, topic: 1 });
        console.log(`📊 Fetched ${questions.length} questions`);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Question Paper Generator';
        workbook.created = new Date();

        // ========================================================
        // SHEET 1: Summary Dashboard
        // ========================================================
        const summarySheet = workbook.addWorksheet('Summary Dashboard', {
            properties: { tabColor: { argb: '4472C4' } }
        });

        // Title
        summarySheet.mergeCells('A1:F1');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = 'Question Bank - Summary Report';
        titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(1).height = 40;

        // Generated date
        summarySheet.mergeCells('A2:F2');
        const dateCell = summarySheet.getCell('A2');
        dateCell.value = `Generated on: ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}`;
        dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '666666' } };
        dateCell.alignment = { horizontal: 'center' };

        // --- Overall Stats ---
        summarySheet.getCell('A4').value = 'Overall Statistics';
        summarySheet.getCell('A4').font = { name: 'Calibri', size: 14, bold: true, color: { argb: '2F5496' } };
        summarySheet.mergeCells('A4:C4');

        const statsHeaders = ['Metric', 'Value'];
        const statsHeaderRow = summarySheet.addRow(statsHeaders);
        statsHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        const subjects = [...new Set(questions.map(q => q.subject))];
        const types = [...new Set(questions.map(q => q.questionType))];
        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

        const statsData = [
            ['Total Questions', questions.length],
            ['Total Subjects', subjects.length],
            ['Total Marks (All Questions)', totalMarks],
            ['Question Types Available', types.join(', ')],
        ];
        statsData.forEach(row => {
            const r = summarySheet.addRow(row);
            r.getCell(1).font = { bold: true, name: 'Calibri', size: 11 };
            r.getCell(2).font = { name: 'Calibri', size: 11 };
            r.eachCell(cell => {
                cell.border = { bottom: { style: 'hair', color: { argb: 'CCCCCC' } } };
            });
        });

        // --- By Subject ---
        summarySheet.addRow([]);
        const subjTitle = summarySheet.addRow(['Questions by Subject']);
        subjTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: '2F5496' } };
        summarySheet.mergeCells(subjTitle.number, 1, subjTitle.number, 3);

        const subjHeaders = ['Subject', 'Count', 'Total Marks'];
        const subjHeaderRow = summarySheet.addRow(subjHeaders);
        subjHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '548235' } };
            cell.alignment = { horizontal: 'center' };
        });

        subjects.forEach(subj => {
            const subjQuestions = questions.filter(q => q.subject === subj);
            const marks = subjQuestions.reduce((sum, q) => sum + q.marks, 0);
            const r = summarySheet.addRow([subj, subjQuestions.length, marks]);
            r.eachCell(cell => {
                cell.border = { bottom: { style: 'hair', color: { argb: 'CCCCCC' } } };
                cell.font = { name: 'Calibri', size: 11 };
            });
        });

        // --- By Question Type ---
        summarySheet.addRow([]);
        const typeTitle = summarySheet.addRow(['Questions by Type']);
        typeTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: '2F5496' } };
        summarySheet.mergeCells(typeTitle.number, 1, typeTitle.number, 3);

        const typeHeaders = ['Question Type', 'Count', 'Marks Each'];
        const typeHeaderRow = summarySheet.addRow(typeHeaders);
        typeHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BF8F00' } };
            cell.alignment = { horizontal: 'center' };
        });

        const typeOrder = ['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'];
        typeOrder.forEach(type => {
            const typeQuestions = questions.filter(q => q.questionType === type);
            if (typeQuestions.length > 0) {
                const marksEach = typeQuestions[0].marks;
                const r = summarySheet.addRow([type, typeQuestions.length, marksEach]);
                r.eachCell(cell => {
                    cell.border = { bottom: { style: 'hair', color: { argb: 'CCCCCC' } } };
                    cell.font = { name: 'Calibri', size: 11 };
                });
            }
        });

        // --- By Difficulty ---
        summarySheet.addRow([]);
        const diffTitle = summarySheet.addRow(['Questions by Difficulty Level']);
        diffTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: '2F5496' } };
        summarySheet.mergeCells(diffTitle.number, 1, diffTitle.number, 3);

        const diffHeaders = ['Difficulty', 'Count', 'Percentage'];
        const diffHeaderRow = summarySheet.addRow(diffHeaders);
        diffHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C00000' } };
            cell.alignment = { horizontal: 'center' };
        });

        const diffLabels = { 1: 'Very Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Very Hard' };
        for (let d = 1; d <= 5; d++) {
            const count = questions.filter(q => q.difficultyLevel === d).length;
            if (count > 0) {
                const pct = ((count / questions.length) * 100).toFixed(1) + '%';
                const r = summarySheet.addRow([`${d} - ${diffLabels[d]}`, count, pct]);
                r.eachCell(cell => {
                    cell.border = { bottom: { style: 'hair', color: { argb: 'CCCCCC' } } };
                    cell.font = { name: 'Calibri', size: 11 };
                });
            }
        }

        // --- By Bloom's Taxonomy ---
        summarySheet.addRow([]);
        const bloomTitle = summarySheet.addRow(["Questions by Bloom's Taxonomy"]);
        bloomTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: '2F5496' } };
        summarySheet.mergeCells(bloomTitle.number, 1, bloomTitle.number, 3);

        const bloomHeaders = ['Level', 'Count', 'Percentage'];
        const bloomHeaderRow = summarySheet.addRow(bloomHeaders);
        bloomHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7030A0' } };
            cell.alignment = { horizontal: 'center' };
        });

        const bloomLabels = { R: 'Remember', U: 'Understand', P: 'Apply', N: 'Analyze', E: 'Evaluate', C: 'Create' };
        Object.entries(bloomLabels).forEach(([code, label]) => {
            const count = questions.filter(q => q.bloomsTaxonomy === code).length;
            if (count > 0) {
                const pct = ((count / questions.length) * 100).toFixed(1) + '%';
                const r = summarySheet.addRow([`${code} - ${label}`, count, pct]);
                r.eachCell(cell => {
                    cell.border = { bottom: { style: 'hair', color: { argb: 'CCCCCC' } } };
                    cell.font = { name: 'Calibri', size: 11 };
                });
            }
        });

        // Set column widths for summary
        summarySheet.getColumn(1).width = 35;
        summarySheet.getColumn(2).width = 20;
        summarySheet.getColumn(3).width = 20;

        // ========================================================
        // SHEET 2: All Questions
        // ========================================================
        const allSheet = workbook.addWorksheet('All Questions', {
            properties: { tabColor: { argb: '548235' } }
        });

        // Title
        allSheet.mergeCells('A1:L1');
        const allTitle = allSheet.getCell('A1');
        allTitle.value = 'Complete Question Bank';
        allTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
        allTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
        allTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        allSheet.getRow(1).height = 35;

        const allHeaders = [
            'S.No', 'Subject', 'Topic', 'Unit', 'Question Type', 'Marks',
            'Difficulty', 'Question Text', 'Options', 'Correct Answer',
            "Bloom's Taxonomy", 'CLO Mapping'
        ];
        const allHeaderRow = allSheet.addRow(allHeaders);
        allHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            };
        });
        allSheet.getRow(2).height = 25;

        // Alternating row colors
        const typeColors = {
            'MCQ': 'E2EFDA',
            '2 Mark': 'DAEEF3',
            '5 Mark': 'FFF2CC',
            '10 Mark': 'FCE4EC'
        };

        questions.forEach((q, idx) => {
            const row = allSheet.addRow([
                idx + 1,
                q.subject,
                q.topic,
                q.unit || '-',
                q.questionType,
                q.marks,
                `${q.difficultyLevel} - ${diffLabels[q.difficultyLevel] || ''}`,
                q.text,
                q.options && q.options.length > 0 ? q.options.join(' | ') : '-',
                q.correctAnswer || '-',
                `${q.bloomsTaxonomy} - ${bloomLabels[q.bloomsTaxonomy] || ''}`,
                q.cloMapping
            ]);

            const bgColor = typeColors[q.questionType] || 'FFFFFF';
            row.eachCell(cell => {
                cell.font = { name: 'Calibri', size: 10 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                cell.border = {
                    bottom: { style: 'hair', color: { argb: 'CCCCCC' } },
                    left: { style: 'hair', color: { argb: 'CCCCCC' } },
                    right: { style: 'hair', color: { argb: 'CCCCCC' } }
                };
                cell.alignment = { vertical: 'top', wrapText: true };
            });
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'top' };
            row.getCell(6).alignment = { horizontal: 'center', vertical: 'top' };
            row.getCell(12).alignment = { horizontal: 'center', vertical: 'top' };
        });

        // Set column widths
        const colWidths = [6, 18, 16, 8, 13, 8, 14, 55, 35, 35, 16, 12];
        colWidths.forEach((w, i) => { allSheet.getColumn(i + 1).width = w; });

        // Auto-filter
        allSheet.autoFilter = { from: 'A2', to: 'L2' };

        // ========================================================
        // SHEET 3: Subject-wise breakdown (one per subject)
        // ========================================================
        subjects.forEach(subj => {
            const shortName = subj.length > 28 ? subj.substring(0, 28) + '..' : subj;
            const sheet = workbook.addWorksheet(shortName, {
                properties: { tabColor: { argb: 'BF8F00' } }
            });

            sheet.mergeCells('A1:H1');
            const sTitle = sheet.getCell('A1');
            sTitle.value = `${subj} - Question Details`;
            sTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFF' } };
            sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
            sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getRow(1).height = 30;

            const subjQuestions = questions.filter(q => q.subject === subj);

            // Quick stats row
            const mcqCount = subjQuestions.filter(q => q.questionType === 'MCQ').length;
            const twoCount = subjQuestions.filter(q => q.questionType === '2 Mark').length;
            const fiveCount = subjQuestions.filter(q => q.questionType === '5 Mark').length;
            const tenCount = subjQuestions.filter(q => q.questionType === '10 Mark').length;

            sheet.addRow([`Total: ${subjQuestions.length}`, `MCQ: ${mcqCount}`, `2-Mark: ${twoCount}`, `5-Mark: ${fiveCount}`, `10-Mark: ${tenCount}`])
                .eachCell(cell => {
                    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '2F5496' } };
                });

            sheet.addRow([]);

            const headers = ['S.No', 'Topic', 'Unit', 'Type', 'Marks', 'Difficulty', 'Question', 'Bloom\'s'];
            const hRow = sheet.addRow(headers);
            hRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Calibri', size: 11 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '548235' } };
                cell.alignment = { horizontal: 'center', wrapText: true };
                cell.border = { bottom: { style: 'thin' } };
            });

            subjQuestions.forEach((q, idx) => {
                const row = sheet.addRow([
                    idx + 1,
                    q.topic,
                    q.unit || '-',
                    q.questionType,
                    q.marks,
                    q.difficultyLevel,
                    q.text,
                    q.bloomsTaxonomy
                ]);
                const bgColor = typeColors[q.questionType] || 'FFFFFF';
                row.eachCell(cell => {
                    cell.font = { name: 'Calibri', size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.alignment = { vertical: 'top', wrapText: true };
                    cell.border = { bottom: { style: 'hair', color: { argb: 'DDDDDD' } } };
                });
            });

            const sColWidths = [6, 18, 8, 12, 8, 10, 60, 10];
            sColWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
            sheet.autoFilter = { from: `A4`, to: `H4` };
        });

        // Save
        const outputPath = path.join(__dirname, '..', 'Question_Bank_Summary_Report.xlsx');
        await workbook.xlsx.writeFile(outputPath);
        console.log(`\n✅ Report generated successfully!`);
        console.log(`📁 Saved to: ${outputPath}`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error generating report:', error.message);
        process.exit(1);
    }
}

generateReport();
