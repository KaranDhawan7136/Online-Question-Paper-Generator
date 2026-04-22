/**
 * Smart Question Bank Parser v3
 * 
 * Handles multiple document formats commonly found in university question banks:
 *   - Inline MCQs: "Question text?(a) opt1 (b) opt2 (c) opt3 (d) opt4"
 *   - Multi-line MCQs: Question on one line, options on separate lines
 *   - Options in formats: A) B) C) D), (a) (b) (c) (d), a. b. c. d., i) ii) iii) iv)
 *   - Numbered questions: "1.", "1)", "27 What is...", "Q65 Predict Output"
 *   - Unnumbered questions (detected by question-word patterns)
 *   - Section headers: "Section A – 1 Marks Each", "Section A – MCQ", "5 Marks Questions"
 *   - Topic headers: "Problem Solving & Algorithms", "Arrays, Strings", etc.
 *   - Descriptive (non-MCQ) questions in Sections B/C/D
 */

/**
 * Detect section boundaries and their marks/types.
 */
function detectSections(text) {
    const sections = [];
    
    const allPatterns = [
        // "Section A – 1 Marks Each" / "Section B – 3 Marks Each" / "Section A – 1 Mark Each"
        { regex: /Section\s+([A-Z])\s*[-–—]\s*(\d+)\s*Marks?\b/gi, type: 'numMark' },
        // "Section A – MCQ" / "Section A – MCQs"
        { regex: /Section\s+([A-Z])\s*[-–—]\s*MCQs?\b/gi, type: 'mcq' },
        // "SECTION-A (1 Mark)" / "Section-B (3 Marks MCQ)"
        { regex: /Section\s*[-–—]\s*([A-Z])\s*\(([^)]*)\)/gi, type: 'paren' },
        // "5 Marks Questions" (standalone, no section letter)
        { regex: /(\d+)\s*Marks?\s*Questions/gi, type: 'standalone' },
    ];

    for (const { regex, type } of allPatterns) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            // Skip if this position is already covered
            if (sections.some(s => Math.abs(s.startIndex - match.index) < 15)) continue;

            let letter, marks, questionType;

            if (type === 'mcq') {
                letter = match[1].toUpperCase();
                marks = 1;
                questionType = 'MCQ';
            } else if (type === 'numMark') {
                letter = match[1].toUpperCase();
                marks = parseInt(match[2]) || 1;
                questionType = marks === 1 ? 'MCQ' : `${marks} Mark`;
            } else if (type === 'paren') {
                letter = match[1].toUpperCase();
                const marksMatch = match[2] ? match[2].match(/(\d+)/) : null;
                marks = marksMatch ? parseInt(marksMatch[1]) : 1;
                if (/MCQ/i.test(match[2])) { marks = 1; questionType = 'MCQ'; }
                else { questionType = marks === 1 ? 'MCQ' : `${marks} Mark`; }
            } else { // standalone
                marks = parseInt(match[1]);
                letter = marks === 1 ? 'A' : marks <= 3 ? 'B' : marks <= 5 ? 'C' : 'D';
                questionType = marks === 1 ? 'MCQ' : `${marks} Mark`;
            }

            // Normalize questionType
            if (marks === 2) questionType = '2 Mark';
            else if (marks === 3) questionType = '3 Mark';
            else if (marks === 5) questionType = '5 Mark';
            else if (marks >= 10) questionType = '10 Mark';

            sections.push({
                startIndex: match.index,
                letter,
                marks,
                questionType,
                label: match[0]
            });
        }
    }

    sections.sort((a, b) => a.startIndex - b.startIndex);
    return sections;
}

/**
 * Analyze actual question content to determine difficulty level (1-5).
 * Uses Bloom's taxonomy verb analysis, code complexity, and multi-step indicators.
 */
function analyzeDifficulty(questionText, marks) {
    if (!questionText || questionText.length < 5) return 2;
    const text = questionText.toLowerCase();

    // Level 5 indicators: Evaluation/Creation — highest cognitive load
    const level5 = /\b(justify|evaluate|critique|develop an optimized|design and implement|prove|derive|optimize|compare\s+and\s+contrast\s+with\s+example|formulate|propose|construct\s+an?\s+algorithm)\b/i;
    if (level5.test(text)) return 5;

    // Level 4 indicators: Analysis/Design — multi-step, output prediction, debugging
    const level4 = /\b(debug|trace|analyze|predict\s+(?:the\s+)?output|design|what\s+(?:is|will\s+be)\s+(?:the\s+)?output|find\s+(?:the\s+)?error|correct\s+the\s+(?:code|program)|rewrite|modify\s+the\s+(?:code|program)|convert|implement\s+using|develop|step\s*-?\s*by\s*-?\s*step)\b/i;
    if (level4.test(text)) return 4;

    // Code presence (without explicit verbs) suggests at least level 3
    const hasCode = /\b(printf|scanf|int\s+main|#include|void\s+\w+|for\s*\(|while\s*\(|if\s*\(|switch\s*\(|return\s+\d|cout|cin|System\.out|public\s+class)\b/.test(text);

    // Level 3 indicators: Application/Comparison — write code, explain concepts, compare
    const level3 = /\b(write\s+(?:a\s+)?(?:program|code|function|algorithm)|explain\s+with|compare|differentiate|distinguish|illustrate|demonstrate|implement|solve|apply|calculate|compute|draw|tabulate|enumerate\s+and\s+explain|discuss)\b/i;
    if (level3.test(text)) return 3;
    if (hasCode) return 3;

    // Level 1 indicators: Pure recall/definition
    const level1 = /\b(define\b|what\s+is\s+(the\s+)?(definition|meaning|full\s+form|abbreviation|expansion)|name\s+the|list\s+(?:the\s+)?(?:types|names|components)|state\s+the|who\s+(invented|created|developed)|which\s+year|true\s+or\s+false|fill\s+in\s+the\s+blank)\b/i;
    if (level1.test(text)) return 1;

    // Level 2 indicators: Basic understanding — simple MCQ, identify, select
    const level2 = /\b(which\s+of\s+the\s+following|identify|select|choose|what\s+is|what\s+are|how\s+many|what\s+does|what\s+type|which\s+keyword|which\s+operator|which\s+function|name|state|recall)\b/i;
    if (level2.test(text)) return 2;

    // Fallback: use marks as a rough guide, but with better mapping
    if (marks >= 10) return 4;
    if (marks >= 5) return 3;
    if (marks >= 3) return 3;
    return 2;
}

/**
 * Check if a line is a topic header (not a question).
 */
function isTopicHeader(line) {
    // Common topic header patterns
    if (/^(Problem Solving|Introduction to|Operators|Conditional|Arrays|Strings|Functions|Pointers|Structures|Loops|Control|Data Types|Variables|C Programming)/i.test(line)) return true;
    // Short line, no question mark, no colon, no options, not a question number
    if (line.length < 60 && !line.includes('?') && !line.includes(':') &&
        !/\([a-d]\)/i.test(line) && !/^Q?\d/i.test(line) &&
        /[A-Z]/.test(line[0]) && !/^[A-D]\)/i.test(line) && !/^\([a-d]\)/i.test(line)) {
        if (/[&,]/.test(line) || /^\w+(\s+\w+){0,5}$/.test(line)) return true;
    }
    return false;
}

/**
 * Strip option letter/number prefixes from option text.
 * Handles: "A) text", "a. text", "(a) text", "i) text", "A. text", etc.
 */
function cleanOptionText(optText) {
    if (!optText || typeof optText !== 'string') return '';
    // Remove leading letter/roman prefixes like: A) a. (a) (A) A. i) ii) iii) iv)
    return optText.replace(/^\s*(?:\(?[a-dA-D]\)?[.)\s]|(?:i{1,3}|iv)\s*[.)]\s*)\s*/i, '').trim();
}

/**
 * Extract inline MCQ options from a line.
 * Handles: "(a) opt1 (b) opt2 (c) opt3 (d) opt4"
 */
function extractInlineOptions(text) {
    const pattern = /\(([a-d])\)\s*(.+?)(?=\s*\([a-d]\)|$)/gi;
    const matches = [...text.matchAll(pattern)];
    if (matches.length >= 3) {
        const firstIdx = text.search(/\([a-d]\)/i);
        let questionText = text.substring(0, firstIdx).trim();
        questionText = questionText.replace(/:\s*$/, '').trim();
        const options = matches.map(m => m[2].trim());
        return { questionText, options };
    }
    return null;
}

/**
 * Check if a line starts with a question number/prefix.
 * Matches: "27 What is...", "Q65 Predict...", "Q0a Given...", "1. text", "1) text",
 *          "i) text", "ii) text", "iii) text", "iv) text" (roman numerals)
 */
function parseQuestionStart(line) {
    let m;

    // Q-prefixed: Q65, Q0a, Q1, Q92., Q93\t, etc.
    m = line.match(/^Q(\d+[a-z]?)\s*[.)\t ]\s*(.+)$/i);
    if (m) return { id: m[1], text: m[2].trim() };
    
    // "Q71" alone on a line (no text after)
    m = line.match(/^Q(\d+[a-z]?)\s*$/i);
    if (m) return { id: m[1], text: '' };
    
    // "1. text" or "27. text" or "1) text" or "27) text"
    m = line.match(/^(\d{1,3})\s*[.)]\s+(.+)$/);
    if (m && parseInt(m[1]) > 0) return { id: m[1], text: m[2] };
    
    // Numbered without separator: "27 What is..." (need at least 10 chars of text)
    m = line.match(/^(\d{1,3})\s+(.{10,})$/);
    if (m && parseInt(m[1]) > 0) return { id: m[1], text: m[2] };

    // Roman numeral prefixed: "i)", "ii)", "iii)", "iv)", "v)", "vi)" etc.
    m = line.match(/^(i{1,3}|iv|v|vi{0,3}|ix|x)\s*[.)]\s+(.+)$/i);
    if (m) return { id: m[1], text: m[2] };
    
    return null;
}

/**
 * Check if a line is a standalone MCQ option.
 * Handles: "A)", "B.", "A. text", "A) text", "(a) text", "(a)", "i) text" (when in option context)
 */
function parseOption(line) {
    // Format 1: "A) text" or "A. text" or "a) text" (single letter A-D)
    let m = line.match(/^([A-Da-d])\s*[.)]\s*(.*)$/);
    if (m) {
        const letter = m[1].toUpperCase();
        if ('ABCD'.includes(letter)) {
            return { letter, text: m[2].trim() };
        }
    }
    // Format 2: "(a) text" or "(A) text" (with parentheses)
    m = line.match(/^\(([a-dA-D])\)\s*(.*)$/);
    if (m) {
        return { letter: m[1].toUpperCase(), text: m[2].trim() };
    }
    // Format 3: Roman numeral options: "i) text", "ii) text", "iii) text", "iv) text"
    m = line.match(/^(i{1,3}|iv)\s*[.)]\s*(.+)$/i);
    if (m) {
        const romanMap = { 'i': 'A', 'ii': 'B', 'iii': 'C', 'iv': 'D' };
        const mapped = romanMap[m[1].toLowerCase()];
        if (mapped) {
            return { letter: mapped, text: m[2].trim() };
        }
    }
    return null;
}

/**
 * Check if a line looks like a question (not a code line or junk).
 * Returns the cleaned question text if it is a question, null otherwise.
 */
function detectUnnumberedQuestion(line, nextLine) {
    if (line.length < 15) return null;
    if (line.startsWith('//') || line.startsWith('#include') || line.startsWith('#define')) return null;
    // Skip lines that look like column/match content
    if (/^(Column [AB]|A\.|B\.|C\.|D\.)\s/i.test(line) && line.length < 40) return null;
    
    // Lines ending with ? or : are likely questions
    if (/[?:]\s*$/.test(line)) {
        return line.replace(/:$/, '').trim();
    }
    
    // Lines starting with common question words
    if (/^(Which|What|Who|How|When|Where|Why|Define|Differentiate|Write|Explain|Predict|List|Name|State|Compare|Evaluate|Match|Design|Develop|Convert|Demonstrate|Justify|Discuss|Analyze|Debug|The |Given|Declare|Provide|Can |Does |Identify|Describe|Implement|Create|Find|Calculate|Determine)/i.test(line)) {
        return line.replace(/:$/, '').trim();
    }
    
    // Lines with question + code on same line: "What is printed? printf("%f", 5);"
    if (/\?\s*.+/.test(line) && line.length >= 20) {
        return line;
    }
    
    // Lines that end with typical question endings
    if (/\b(is|are|was|does|do|will|would|can|should)\s*[?:]?\s*$/i.test(line)) {
        return line.replace(/:$/, '').trim();
    }
    
    // If next line is an option, this line is probably a question
    if (nextLine && parseOption(nextLine)) {
        return line.replace(/:$/, '').trim();
    }
    
    return null;
}

/**
 * Parse all MCQ questions from a section of text.
 * Handles inline, multi-line, numbered, unnumbered, and various option formats.
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
        const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

        // Skip junk lines
        if (/^(Total\s*No|QUESTION\s*BANK|No\.\s*of\s*Pages|There are sections|Programming Essentials|BCA\s)/i.test(line)) continue;
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
            saveQ();
            continue;
        }

        // CASE 2: Numbered question start — "27 What is printed?", "Q65 Predict Output", "1. text"
        const qStart = parseQuestionStart(line);
        if (qStart) {
            saveQ();
            // Check if the text part itself has inline options
            if (qStart.text) {
                const inlineInQ = extractInlineOptions(qStart.text);
                if (inlineInQ && inlineInQ.questionText.length >= 3) {
                    currentQ = { text: inlineInQ.questionText, options: inlineInQ.options };
                    saveQ();
                } else {
                    currentQ = { text: qStart.text, options: [] };
                }
            } else {
                // Q71 alone — text will come from continuation lines
                currentQ = { text: '', options: [] };
            }
            continue;
        }

        // CASE 3: Option line — "A) text", "(a) text", "i) text"
        const opt = parseOption(line);
        if (opt && currentQ) {
            if (opt.text) {
                currentQ.options.push(opt.text);
                pendingOptionLetter = null;
            } else {
                pendingOptionLetter = opt.letter;
            }
            // Auto-save when we have 4 options (A through D complete)
            if (currentQ.options.length >= 4 && opt.letter === 'D') {
                saveQ();
            }
            continue;
        }

        // CASE 4: If we just saw a standalone option letter, this line is its text
        if (pendingOptionLetter && currentQ) {
            currentQ.options.push(line);
            pendingOptionLetter = null;
            if (currentQ && currentQ.options.length >= 4) {
                saveQ();
            }
            continue;
        }

        // CASE 4b: If current question already has options but this line is NOT an option,
        // save the current question and try this line as a new question
        if (currentQ && currentQ.options.length > 0) {
            saveQ();
            // Fall through to CASE 6 below
        }

        // CASE 5: Continuation text for current question (if no options yet)
        if (currentQ && currentQ.options.length === 0) {
            // Check if this continuation line has inline options
            const contInline = extractInlineOptions(line);
            if (contInline && contInline.options.length >= 3) {
                if (contInline.questionText.length > 0) {
                    currentQ.text += ' ' + contInline.questionText;
                }
                currentQ.options = contInline.options;
                saveQ();
                continue;
            }
            // Check if this line is itself an option
            const contOpt = parseOption(line);
            if (contOpt) {
                if (contOpt.text) {
                    currentQ.options.push(contOpt.text);
                } else {
                    pendingOptionLetter = contOpt.letter;
                }
                continue;
            }
            // Otherwise, append as continuation text
            currentQ.text += ' ' + line;
            continue;
        }

        // CASE 6: Unnumbered question — detect question-like lines
        if (!currentQ) {
            const qText = detectUnnumberedQuestion(line, nextLine);
            if (qText) {
                const qInline = extractInlineOptions(qText);
                if (qInline && qInline.questionText.length >= 5) {
                    currentQ = { text: qInline.questionText, options: qInline.options };
                    saveQ();
                } else {
                    currentQ = { text: qText, options: [] };
                }
                continue;
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
        if (/^(Total\s*No|QUESTION\s*BANK|No\.\s*of\s*Pages|There are sections|Programming Essentials|BCA\s)/i.test(line)) continue;
        if (/^(Section|SECTION)\s/i.test(line)) continue;

        // Topic header
        if (isTopicHeader(line)) {
            saveQ();
            topic = line.replace(/\s*\(.*$/, '').trim();
            continue;
        }

        // Question start (numbered — "Q1", "1.", "1)", etc.)
        const qStart = parseQuestionStart(line);
        if (qStart) {
            saveQ();
            currentQ = { text: qStart.text || '', options: [] };
            continue;
        }

        // Unnumbered question detection — check even if currentQ exists,
        // because in unnumbered descriptive sections each line is often a separate question
        if (line.length >= 15) {
            const qText = detectUnnumberedQuestion(line, i + 1 < lines.length ? lines[i + 1] : null);
            if (qText) {
                saveQ();
                currentQ = { text: qText, options: [] };
                continue;
            }
        }

        // Continuation text for current question
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
                correctAnswer: '', difficultyLevel: analyzeDifficulty(q.text, 1)
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

        parsed.forEach(q => {
            allQuestions.push({
                text: q.text,
                subject: [subject],
                topic: q.topic ? [q.topic] : [],
                marks: section.marks,
                questionType: section.questionType,
                options: q.options || [],
                correctAnswer: '',
                difficultyLevel: analyzeDifficulty(q.text, section.marks)
            });
        });

        stats[`Section ${section.letter} (${section.questionType})`] = parsed.length;
    });

    return { questions: allQuestions, errors, stats };
}

module.exports = { parseQuestionBank };
