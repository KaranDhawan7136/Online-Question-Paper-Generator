/**
 * Keyword-based Topic Matcher
 * 
 * Matches questions to CHO topics using keyword overlap scoring.
 * No API calls needed — purely algorithmic, instant results.
 */

// Common stop words to ignore during matching
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'and', 'but', 'or', 'if', 'while', 'because',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'its', 'it', 'he', 'she', 'they', 'them', 'we', 'you', 'i', 'me',
    'my', 'your', 'his', 'her', 'our', 'their', 'using', 'used', 'use',
    'following', 'given', 'write', 'explain', 'define', 'state', 'list',
    'describe', 'discuss', 'differentiate', 'compare', 'predict', 'output',
    'program', 'code', 'example', 'answer', 'question', 'marks', 'mark',
    'printed', 'print', 'result', 'value', 'true', 'false', 'correct'
]);

// C programming specific keywords mapped to broader categories
const KEYWORD_BOOST = {
    // Data types & variables
    'int': ['data types', 'variables'],
    'float': ['data types', 'variables'],
    'double': ['data types', 'variables'],
    'char': ['data types', 'variables', 'strings'],
    'void': ['data types', 'functions'],
    'sizeof': ['data types'],
    'typedef': ['user defined data types'],
    'enum': ['user defined data types'],
    'struct': ['structures', 'user defined data types'],
    'union': ['structures', 'user defined data types'],
    
    // Operators
    'operator': ['operators'],
    'precedence': ['operators'],
    'associativity': ['operators'],
    'bitwise': ['operators'],
    'ternary': ['operators', 'conditional statements'],
    'increment': ['operators'],
    'decrement': ['operators'],
    'modulus': ['operators'],
    'arithmetic': ['operators'],
    'relational': ['operators'],
    'logical': ['operators'],
    
    // Control flow
    'if': ['conditional statements'],
    'else': ['conditional statements'],
    'switch': ['conditional statements'],
    'case': ['conditional statements'],
    'default': ['conditional statements'],
    'break': ['conditional statements', 'loops'],
    'continue': ['loops'],
    'goto': ['conditional statements'],
    
    // Loops
    'for': ['loops'],
    'while': ['loops'],
    'do-while': ['loops'],
    'loop': ['loops'],
    'nested': ['loops', 'nested loops'],
    'pattern': ['loops', 'nested loops'],
    'infinite': ['loops'],
    'iteration': ['loops'],
    
    // Arrays & Strings
    'array': ['arrays'],
    'index': ['arrays'],
    'string': ['strings'],
    'strlen': ['strings'],
    'strcpy': ['strings'],
    'strcmp': ['strings'],
    'strcat': ['strings'],
    'matrix': ['2d array', 'arrays'],
    
    // Functions
    'function': ['functions'],
    'recursion': ['functions'],
    'recursive': ['functions'],
    'return': ['functions'],
    'parameter': ['functions'],
    'argument': ['functions'],
    'call by value': ['functions'],
    'call by reference': ['functions'],
    
    // Pointers
    'pointer': ['pointers'],
    'address': ['pointers'],
    'dereference': ['pointers'],
    'malloc': ['dynamic memory allocation'],
    'calloc': ['dynamic memory allocation'],
    'realloc': ['dynamic memory allocation'],
    'free': ['dynamic memory allocation'],
    
    // I/O
    'printf': ['input output', 'format specifiers'],
    'scanf': ['input output'],
    'format specifier': ['input output', 'format specifiers'],
    '%d': ['format specifiers'],
    '%f': ['format specifiers'],
    '%c': ['format specifiers'],
    '%s': ['format specifiers'],
    
    // File handling
    'file': ['file handling'],
    'fopen': ['file handling'],
    'fclose': ['file handling'],
    'fread': ['file handling'],
    'fwrite': ['file handling'],
    'fseek': ['file handling'],
    
    // Preprocessor
    '#include': ['preprocessor'],
    '#define': ['preprocessor'],
    'macro': ['preprocessor'],
    'header': ['preprocessor'],
    
    // Problem solving
    'algorithm': ['problem solving'],
    'flowchart': ['problem solving'],
    'pseudocode': ['problem solving'],
    'decomposition': ['problem solving'],
    'pattern recognition': ['problem solving'],
    
    // Storage classes
    'auto': ['storage classes'],
    'extern': ['storage classes'],
    'static': ['storage classes'],
    'register': ['storage classes'],
};

/**
 * Tokenize text into meaningful keywords
 */
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9#%_\- ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Shorten a CHO topic description to a clean label
 */
function getTopicLabel(topicDesc) {
    if (topicDesc.includes(':')) {
        return topicDesc.split(':')[0].trim();
    }
    if (topicDesc.includes(',')) {
        const firstPart = topicDesc.split(',')[0].trim();
        if (firstPart.length > 3) return firstPart;
    }
    return topicDesc.trim().split(/\s+/).slice(0, 4).join(' ');
}

/**
 * Calculate match score between a question and a CHO topic
 */
function calculateScore(questionTokens, topicTokens, topicDesc) {
    let score = 0;
    const topicLower = topicDesc.toLowerCase();
    
    // 1. Direct keyword overlap
    for (const token of questionTokens) {
        if (topicTokens.has(token)) {
            score += 2;
        }
    }
    
    // 2. Boost from C-specific keyword mapping
    for (const token of questionTokens) {
        const boosts = KEYWORD_BOOST[token];
        if (boosts) {
            for (const boostCategory of boosts) {
                if (topicLower.includes(boostCategory)) {
                    score += 3;
                }
            }
        }
    }
    
    // 3. Substring matching for multi-word terms
    const questionText = questionTokens.join(' ');
    const importantPhrases = [
        'if else', 'if-else', 'switch case', 'do while', 'do-while',
        'for loop', 'while loop', 'nested loop', 'nested for',
        'call by value', 'call by reference', 'format specifier',
        'data type', 'escape sequence', 'operator precedence',
        'dynamic memory', 'file handling', 'storage class',
        'user defined', 'problem solving', 'pattern printing'
    ];
    
    for (const phrase of importantPhrases) {
        if (questionText.includes(phrase) && topicLower.includes(phrase)) {
            score += 5;
        }
    }
    
    return score;
}

/**
 * Match questions to CHO topics using keyword scoring.
 * 
 * @param {Array} questions - Array of {text, questionType} objects
 * @param {Array} choMappings - Array of CHO mappings with {topic, unit, clo}
 * @returns {Array} - Array of {topic, unit, clo} for each question
 */
function matchQuestionsToCHO(questions, choMappings) {
    if (!choMappings || choMappings.length === 0 || !questions || questions.length === 0) {
        return null;
    }

    // Build topic profiles: tokenize each CHO topic + description (sub-topics)
    const topicProfiles = choMappings.map(m => {
        // Combine topic name + description for maximum keyword coverage
        const fullText = [m.topic || '', m.description || ''].join(' ');
        return {
            label: getTopicLabel(m.topic || ''),
            fullDesc: fullText,
            tokens: new Set(tokenize(fullText)),
            unit: m.unit,
            clo: m.cloMapping || m.clo,
            lectureNumber: m.lectureNumber || ''
        };
    });

    // Deduplicate by label (keep first occurrence)
    const seen = new Set();
    const uniqueProfiles = topicProfiles.filter(p => {
        if (seen.has(p.label)) return false;
        seen.add(p.label);
        return true;
    });

    console.log(`  Keyword matcher: ${uniqueProfiles.length} unique CHO topics loaded`);
    uniqueProfiles.forEach(p => console.log(`    - "${p.label}" (${p.tokens.size} keywords: ${[...p.tokens].slice(0, 8).join(', ')}...)`));

    // Match each question — assign multiple topics if scores are close
    const MIN_SCORE = 2;         // Minimum score to consider a topic match
    const MULTI_THRESHOLD = 0.6; // Include topics scoring >= 60% of best score

    const results = questions.map((q, idx) => {
        const qText = typeof q.text === 'string' ? q.text : '';
        const qTokens = tokenize(qText);
        
        if (qTokens.length === 0) {
            return { topics: [uniqueProfiles[0]?.label || 'General'], unit: '', clo: '' };
        }

        // Score against each topic
        const scores = uniqueProfiles.map(profile => ({
            profile,
            score: calculateScore(qTokens, profile.tokens, profile.fullDesc)
        }));

        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);
        const bestScore = scores[0].score;

        if (bestScore < MIN_SCORE) {
            // No good match — assign the first topic as fallback
            return { topics: [uniqueProfiles[0]?.label || 'General'], unit: scores[0].profile.unit || '', clo: scores[0].profile.clo || '' };
        }

        // Collect all topics scoring above the threshold
        const threshold = bestScore * MULTI_THRESHOLD;
        const matchedTopics = [];
        const seenLabels = new Set();

        for (const { profile, score } of scores) {
            if (score >= threshold && score >= MIN_SCORE && !seenLabels.has(profile.label)) {
                matchedTopics.push(profile);
                seenLabels.add(profile.label);
            }
        }

        // Use the best-scoring topic's unit/clo
        return {
            topics: matchedTopics.map(p => p.label),
            unit: matchedTopics[0]?.unit || '',
            clo: matchedTopics[0]?.clo || ''
        };
    });

    // Log stats
    const topicCounts = {};
    let multiCount = 0;
    results.forEach(r => {
        if (r.topics.length > 1) multiCount++;
        r.topics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    });
    console.log(`  Topic distribution (${multiCount} questions matched multiple topics):`);
    Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
        console.log(`    ${t}: ${c} questions`);
    });

    return results;
}

module.exports = { matchQuestionsToCHO, getTopicLabel };
