/**
 * Node.js PDF Generator (Fallback)
 * Generates question paper PDFs using PDFKit when the Python AI service is unavailable.
 * This ensures the hybrid system can always produce PDFs regardless of AI service status.
 */
const PDFDocument = require('pdfkit');

/**
 * Generate a question paper PDF buffer from a paper object.
 * @param {Object} paper - The paper document (with populated questions)
 * @returns {Promise<Buffer>} - PDF as a Buffer
 */
async function generatePaperPDF(paper) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 45, right: 45 }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            // ===== HEADER =====
            doc.font('Helvetica-Bold').fontSize(13);
            doc.text(paper.universityName || 'University Name', { align: 'left', continued: false });
            doc.moveUp();
            doc.text(paper.academicYear || '2025-2026', { align: 'right' });

            doc.moveDown(0.3);
            doc.fontSize(14).text(paper.title || 'Question Paper', { align: 'center' });

            if (paper.semester) {
                doc.fontSize(11).font('Helvetica')
                    .text(`Semester: ${paper.semester}`, { align: 'center' });
            }
            doc.moveDown(0.5);

            // ===== INFO TABLE =====
            const leftX = doc.page.margins.left;
            const rightX = doc.page.width - doc.page.margins.right;
            const infoY = doc.y;

            doc.font('Helvetica').fontSize(10);
            // Left column
            doc.text(`Roll No.: _________________`, leftX, infoY);
            let leftY = doc.y;
            if (paper.programmeName) {
                doc.text(`Programme: ${paper.programmeName}`, leftX);
                leftY = doc.y;
            }
            doc.text(`Course Title: ${paper.courseTitle || paper.subject || ''}`, leftX);
            leftY = doc.y;
            if (paper.courseCode) {
                doc.text(`Course Code: ${paper.courseCode}`, leftX);
                leftY = doc.y;
            }

            // Right column
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text(`[Total No. of Pages: ${paper.totalPages || 2}]`, leftX, infoY, { align: 'right' });
            doc.font('Helvetica').text(`Time: ${paper.duration || 180} minutes`, { align: 'right' });
            doc.text(`Max. Marks: ${paper.totalMarks || 100}`, { align: 'right' });

            doc.y = Math.max(leftY, doc.y) + 10;

            // Divider line
            doc.moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke('#333333');
            doc.moveDown(0.5);

            // ===== INSTRUCTIONS =====
            const instructions = paper.instructions || [
                'Follow the instructions given in each section.',
                'Do not write anything on the question paper, except your roll no.',
                'Make sure that you attempt the questions in order.'
            ];
            doc.font('Helvetica-Bold').fontSize(10).text('General Instructions:');
            doc.font('Helvetica').fontSize(9.5);
            instructions.forEach(inst => {
                doc.text(`  • ${inst}`, { indent: 10 });
            });
            doc.moveDown(0.8);

            // ===== QUESTIONS BY SECTION =====
            const questions = paper.questions || [];
            const optionalConfig = paper.optionalConfig || {};
            const byType = {};
            questions.forEach(q => {
                const type = q.questionType || 'MCQ';
                if (!byType[type]) byType[type] = [];
                byType[type].push(q);
            });

            const sectionOrder = ['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark'];
            const sectionNames = {
                'MCQ': 'Section-A',
                '2 Mark': 'Section-B',
                '3 Mark': 'Section-B',
                '5 Mark': 'Section-C',
                '10 Mark': 'Section-D'
            };
            const markValues = { 'MCQ': 1, '2 Mark': 2, '3 Mark': 3, '5 Mark': 5, '10 Mark': 10 };

            let questionNum = 1;

            sectionOrder.forEach(qtype => {
                const sectionQs = byType[qtype];
                if (!sectionQs || sectionQs.length === 0) return;

                const sectionName = sectionNames[qtype] || 'Section';
                const marks = markValues[qtype] || 0;
                const totalQ = sectionQs.length;

                // Dynamic section note matching web preview logic
                const attemptReq = optionalConfig[qtype]?.attemptRequired;
                const attempt = (attemptReq && attemptReq > 0 && attemptReq < totalQ) ? attemptReq : totalQ;
                let sectionNote;
                if (attempt < totalQ) {
                    sectionNote = `(Attempt any ${attempt} questions, each question carries ${marks.toString().padStart(2, '0')} marks)`;
                } else {
                    sectionNote = `(All Questions are Compulsory. Each question carries ${marks.toString().padStart(2, '0')} ${marks === 1 ? 'mark' : 'marks'})`;
                }

                // Check if we need a new page (if less than 100pt remaining)
                if (doc.y > doc.page.height - 100) {
                    doc.addPage();
                }

                // Section header
                doc.moveDown(0.5);
                doc.font('Helvetica-Bold').fontSize(11)
                    .text(sectionName, { align: 'center', underline: true });
                doc.font('Helvetica-Oblique').fontSize(9.5)
                    .text(sectionNote, { align: 'center' });
                doc.moveDown(0.4);

                sectionQs.forEach(q => {
                    const text = q.text || '';

                    // Check page space
                    if (doc.y > doc.page.height - 80) {
                        doc.addPage();
                    }

                    // Question text
                    doc.font('Helvetica-Bold').fontSize(10.5)
                        .text(`${questionNum}. `, { continued: true, indent: 5 });
                    doc.font('Helvetica').fontSize(10.5)
                        .text(text, { indent: 0 });

                    // MCQ options in 2x2 grid
                    if (qtype === 'MCQ' && q.options && q.options.length > 0) {
                        const labels = ['(i)', '(ii)', '(iii)', '(iv)'];
                        const opts = q.options.slice(0, 4);
                        const colWidth = (pageWidth - 40) / 2;
                        const startX = leftX + 25;

                        for (let row = 0; row < 2; row++) {
                            const y = doc.y + 2;
                            for (let col = 0; col < 2; col++) {
                                const idx = row * 2 + col;
                                if (idx < opts.length) {
                                    const x = startX + col * colWidth;
                                    doc.font('Helvetica-Bold').fontSize(9.5)
                                        .text(`${labels[idx]} `, x, y, { continued: true, width: colWidth - 10 });
                                    doc.font('Helvetica').fontSize(9.5)
                                        .text(opts[idx], { width: colWidth - 10 });
                                }
                            }
                            doc.y = y + 14;
                        }
                    }

                    doc.moveDown(0.3);
                    questionNum++;
                });
            });

            // Footer
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(10)
                .text('— End of Question Paper —', { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePaperPDF };
