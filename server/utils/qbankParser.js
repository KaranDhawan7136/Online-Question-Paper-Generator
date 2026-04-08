/**
 * Smart Question Bank Parser v2
 * 
 * Handles multiple document formats commonly found in university question banks:
 *   - Inline MCQs: "Question text?(a) opt1 (b) opt2 (c) opt3 (d) opt4"
 *   - Multi-line MCQs: Question on one line, A) B) C) D) on separate lines
 *   - Numbered questions: "27 What is printed?", "Q65 Predict Output"
 *   - Unnumbered inline MCQs (no question number at all)
 *   - Section headers: "Section A – 1 Marks Each", "5 Marks Questions", etc.
 *   - Topic headers: "Problem Solving & Algorithms", "Arrays, Strings", etc.
 *   - Descriptive (non-MCQ) questions in Sections B/C/D
 */

/**
 * Detect section boundaries and their marks/types.
 */
function detectSections(text) {
    const sections = [];
    
    // Match various section header patterns:
    // "Section A – 1 Marks Each"  (letter BEFORE dash)
    // "SECTION-A (1 Mark MCQs)"   (letter AFTER dash)
    // "Section B – 3 Marks Each"
    // "5 Marks Questions"
    const patterns = [
        // "Section A – 1 Marks Each" / "Section B – 3 Marks Each"
        /Section\s+([A-Z])\s*[-–—]\s*(\d+)\s*Marks?/gi,
        // "SECTION-A (1 Mark)" / "Section-B (3 Marks MCQ)"
        /Section\s*[-–—]\s*([A-Z])\s*\(([^)]*)\)/gi,
        // "5 Marks Questions" (standalone, no section letter)
        /(\d+)\s*Marks?\s*Questions/gi,
    ];

    // Pattern 1 & 2: Section A – 1 Marks Each / SECTION-A (1 Mark)
    for (const regex of [patterns[0], patterns[1]]) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            const letter = match[1].toUpperCase();
            let marks = 1;
            // Try to extract marks from the captured group
            const marksMatch = match[2] ? match[2].match(/(\d+)/) : match[0].match(/(\d+)\s*mark/i);
            if (marksMatch) marks = parseInt(marksMatch[1]);
            
            let questionType = 'MCQ';
            if (marks === 1) questionType = 'MCQ';
            else if (marks === 2) questionType = '2 Mark';
            else if (marks === 3) questionType = '3 Mark';
            else if (marks === 5) questionType = '5 Mark';
            else if (marks >= 10) questionType = '10 Mark';
            else questionType = `${marks} Mark`;

            // Avoid duplicates at same position
            if (sections.some(s => Math.abs(s.startIndex - match.index) < 10)) continue;

            sections.push({
                startIndex: match.index,
                letter,
                marks,
                questionType,
                label: match[0]
            });
        }
    }

    // Pattern 3: "5 Marks Questions" (no section letter)
    {
        let match;
        const regex = patterns[2];
        while ((match = regex.exec(text)) !== null) {
            const marks = parseInt(match[1]);
            // Skip if this position is already covered by a section
            if (sections.some(s => Math.abs(s.startIndex - match.index) < 30)) continue;

            let letter = 'C';
            if (marks === 1) letter = 'A';
            else if (marks <= 3) letter = 'B';
            else if (marks <= 5) letter = 'C';
            else letter = 'D';

            let questionType = marks === 1 ? 'MCQ' : `${marks} Mark`;

            sections.push({
                startIndex: match.index,
                letter,
                marks,
                questionType,
                label: match[0]
            });
        }
    }

    // Sort by position in document
    sections.sort((a, b) => a.startIndex - b.startIndex);
    return sections;
}

/**
 * Check if a line is a topic header (not a question).
 * Topic headers are short lines that don't end with ? and don't have options.
 */
function isTopicHeader(line) {
    // Common topic header patterns
    if (/^(Problem Solving|Introduction to|Operators|Conditional|Arrays|Strings|Functions|Pointers|Structures|Loops|Control|Data Types|Variables)/i.test(line)) return true;
    // Short line, no question mark, no parentheses options, not a question number
    if (line.length < 60 && !line.includes('?') && !/\([a-d]\)/i.test(line) && !/^Q?\d/i.test(line) && /[A-Z]/.test(line[0]) && !/^[A-D]\)/i.test(line)) {
        // Check if it looks like a section/topic label
        if (/[&,]/.test(line) || /^\w+(\s+\w+){0,5}$/.test(line)) return true;
    }
    return false;
}

/**
 * Extract inline MCQ options from a line.
 * Handles: "(a) opt1 (b) opt2 (c) opt3 (d) opt4"
 */
function extractInlineOptions(text) {
    // Pattern: (a) ... (b) ... (c) ... (d) ...
    const pattern = /\(([a-d])\)\s*(.+?)(?=\s*\([a-d]\)|$)/gi;
    const matches = [...text.matchAll(pattern)];
    if (matches.length >= 3) {
        const firstIdx = text.search(/\([a-d]\)/i);
        let questionText = text.substring(0, firstIdx).trim();
        // Remove trailing colon
        questionText = questionText.replace(/:\s*$/, '').trim();
        const options = matches.map(m => `${m[1].toUpperCase()}) ${m[2].trim()}`);
        return { questionText, options };
    }
    return null;
}

/**
 * Check if a line starts with a question number/prefix.
 * Matches: "27 What is...", "Q65 Predict...", "Q0a Given...", "Q1 Write..."
 */
function parseQuestionStart(line) {
    // Q-prefixed: Q65, Q0a, Q1, etc.
    let m = line.match(/^Q(\d+[a-z]?)\s+(.+)$/i);
    if (m) return { id: m[1], text: m[2] };
    
    // Numbered: "27 What is...", "61 What is..."
    m = line.match(/^(\d+)\s+(.{10,})$/);
    if (m && parseInt(m[1]) > 0) return { id: m[1], text: m[2] };
    
    // "1. text" or "27. text"
    m = line.match(/^(\d+)\s*[.)]\s+(.+)$/);
    if (m) return { id: m[1], text: m[2] };
    
    return null;
}

/**
 * Check if a line is a standalone option: "A)", "B.", "A. text", "A) text"
 */
function parseOption(line) {
    const m = line.match(/^([A-D])\s*[.)]\s*(.*)$/i);
    if (m) {
        return { letter: m[1].toUpperCase(), text: m[2].trim() };
    }
    return null;
}

/**
 * Parse all MCQ questions from a section of text.
 * Handles both inline and multi-line MCQ formats.
 */
function parseMCQSection(sectionText, currentTopic) {
    const questions = [];
    const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let topic = currentTopic || '';
    
    let currentQ = null;
    let pendingOptionLetter = null;

    const saveQ = () => {
        if (currentQ && currentQ.text && currentQ.text.length >= 5) {
            currentQ.topic = topic;
            questions.push({ ...currentQ });
        }
        currentQ = null;
        pendingOptionLetter = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip junk lines
        if (/^(Total\s*No|QUESTION\s*BANK|No\.\s*of\s*Pages|There are sections)/i.test(line)) continue;
        if (/^(Section|SECTION)\s/i.test(line)) continue;

        // Topic header detection
        if (isTopicHeader(line)) {
            saveQ();
            topic = line.replace(/\s*\(.*$/, '').trim();
            continue;
        }

        // CASE 1: Inline MCQ — entire question + (a)(b)(c)(d) on one line
        const inline = extractInlineOptions(line);
        if (inline && inline.questionText.length >= 5) {
            saveQ();
            currentQ = {
                text: inline.questionText,
                options: inline.options
            };
            saveQ(); // Complete question, save immediately
            continue;
        }

        // CASE 2: Numbered question start — "27 What is printed?" or "Q65 Predict Output"
        const qStart = parseQuestionStart(line);
        if (qStart) {
            saveQ();
            // Check if the text part itself has inline options
            const inlineInQ = extractInlineOptions(qStart.text);
            if (inlineInQ && inlineInQ.questionText.length >= 3) {
                currentQ = { text: inlineInQ.questionText, options: inlineInQ.options };
                saveQ();
            } else {
                currentQ = { text: qStart.text, options: [] };
            }
            continue;
        }

        // CASE 3: Option line — "A) text" or standalone "A)"
        const opt = parseOption(line);
        if (opt && currentQ) {
            if (opt.text) {
                currentQ.options.push(`${opt.letter}) ${opt.text}`);
                pendingOptionLetter = null;
            } else {
                pendingOptionLetter = opt.letter;
            }
            continue;
        }

        // CASE 4: If we just saw a standalone option letter, this line is its text
        if (pendingOptionLetter && currentQ) {
            currentQ.options.push(`${pendingOptionLetter}) ${line}`);
            pendingOptionLetter = null;
            continue;
        }

        // CASE 5: Continuation text for current question (if no options yet)
        if (currentQ && currentQ.options.length === 0) {
            // Could be code or additional question text
            currentQ.text += ' ' + line;
            continue;
        }

        // Unmatched line with no current question — might be an unnumbered question
        if (!currentQ && line.length >= 15 && !line.startsWith('//')) {
            // Check if next lines have options → this is an unnumbered question
            const nextInline = extractInlineOptions(line);
            if (nextInline && nextInline.questionText.length >= 5) {
                currentQ = { text: nextInline.questionText, options: nextInline.options };
                saveQ();
            }
        }
    }

    saveQ();

    // Clean up question text
    questions.forEach(q => {
        q.text = q.text.replace(/\s+/g, ' ').trim();
    });

    return questions;
}

/**
 * Parse descriptive (non-MCQ) questions from a section.
 */
function parseDescriptiveSection(sectionText, currentTopic) {
    const questions = [];
    const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let topic = currentTopic || '';
    
    let currentQ = null;

    const saveQ = () => {
        if (currentQ && currentQ.text && currentQ.text.length >= 8) {
            currentQ.topic = topic;
            questions.push({ ...currentQ });
        }
        currentQ = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip junk
        if (/^(Total\s*No|QUESTION\s*BANK|No\.\s*of\s*Pages|There are sections)/i.test(line)) continue;
        if (/^(Section|SECTION)\s/i.test(line)) continue;

        // Topic header
        if (isTopicHeader(line)) {
            saveQ();
            topic = line.replace(/\s*\(.*$/, '').trim();
            continue;
        }

        // Question start
        const qStart = parseQuestionStart(line);
        if (qStart) {
            saveQ();
            currentQ = { text: qStart.text, options: [] };
            continue;
        }

        // Continuation
        if (currentQ) {
            currentQ.text += ' ' + line;
        }
    }

    saveQ();

    questions.forEach(q => {
        q.text = q.text.replace(/\s+/g, ' ').trim();
    });

    return questions;
}

/**
 * Main parser entry point.
 */
function parseQuestionBank(rawText, subject) {
    const allQuestions = [];
    const errors = [];
    const stats = {};

    const sections = detectSections(rawText);

    if (sections.length === 0) {
        // No sections detected — treat entire document as MCQ
        const parsed = parseMCQSection(rawText, '');
        parsed.forEach(q => {
            allQuestions.push({
                text: q.text, subject: [subject], topic: q.topic ? [q.topic] : [],
                marks: 1, questionType: 'MCQ', options: q.options || [],
                correctAnswer: '', difficultyLevel: 2
            });
        });
        stats['All'] = parsed.length;
        if (parsed.length === 0) {
            errors.push('Could not detect any sections or questions in the document.');
        }
        return { questions: allQuestions, errors, stats };
    }

    sections.forEach((section, idx) => {
        const startIdx = section.startIndex + section.label.length;
        const endIdx = idx < sections.length - 1 ? sections[idx + 1].startIndex : rawText.length;
        const sectionText = rawText.substring(startIdx, endIdx);

        let parsed;
        if (section.marks === 1 || section.questionType === 'MCQ') {
            parsed = parseMCQSection(sectionText, '');
        } else {
            parsed = parseDescriptiveSection(sectionText, '');
        }

        let difficulty = 2;
        if (section.marks >= 10) difficulty = 4;
        else if (section.marks >= 5) difficulty = 3;
        else if (section.marks >= 3) difficulty = 3;

        parsed.forEach(q => {
            allQuestions.push({
                text: q.text,
                subject: [subject],
                topic: q.topic ? [q.topic] : [],
                marks: section.marks,
                questionType: section.questionType,
                options: q.options || [],
                correctAnswer: '',
                difficultyLevel: difficulty
            });
        });

        stats[`Section ${section.letter} (${section.questionType})`] = parsed.length;
    });

    return { questions: allQuestions, errors, stats };
}

module.exports = { parseQuestionBank };
