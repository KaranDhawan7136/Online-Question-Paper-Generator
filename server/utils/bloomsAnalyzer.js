/**
 * bloomAnalyzer.js
 * Utility to identify Bloom's Taxonomy level from question text based on action verbs.
 */

const bloomVerbs = {
    // 1. Remember: Recall facts and basic concepts
    'R': ['define', 'duplicate', 'list', 'memorize', 'repeat', 'state', 'what', 'who', 'where', 'when', 'identify', 'name', 'outline', 'recall', 'recognize', 'reproduce', 'label'],
    
    // 2. Understand: Explain ideas or concepts
    'U': ['classify', 'describe', 'discuss', 'explain', 'identify', 'locate', 'recognize', 'report', 'select', 'translate', 'summarize', 'paraphrase', 'illustrate', 'how'],
    
    // 3. Apply: Use information in new situations
    'P': ['execute', 'implement', 'solve', 'use', 'demonstrate', 'interpret', 'operate', 'schedule', 'sketch', 'apply', 'calculate', 'compute', 'determine', 'show'],
    
    // 4. Analyze: Draw connections among ideas
    'N': ['differentiate', 'organize', 'relate', 'compare', 'contrast', 'distinguish', 'examine', 'experiment', 'question', 'test', 'analyze', 'categorize', 'deconstruct', 'infer'],
    
    // 5. Evaluate: Justify a stand or decision
    'E': ['appraise', 'argue', 'defend', 'judge', 'select', 'support', 'value', 'critique', 'weigh', 'evaluate', 'assess', 'justify', 'prove', 'recommend', 'rate'],
    
    // 6. Create: Produce new or original work
    'C': ['design', 'assemble', 'construct', 'conjecture', 'develop', 'formulate', 'author', 'investigate', 'create', 'build', 'plan', 'produce', 'propose', 'invent', 'compose', 'write']
};

/**
 * Determines the Bloom's Taxonomy level of a given question string.
 * It sweeps the first ~20 words of the text looking for the strongest taxonomy verb.
 * If multiple are found, it takes the highest level one (C > E > N > P > U > R), 
 * or the most confident one. For simplicity, we just find the first matched verb
 * in the question, prioritizing the beginning of the sentence.
 *
 * @param {string} questionText - The question string
 * @returns {string} One of 'R', 'U', 'P', 'N', 'E', 'C'
 */
function determineBloomsTaxonomy(questionText) {
    if (!questionText || typeof questionText !== 'string') {
        return 'U'; // Default to Understand
    }

    // Clean text and take the first few words where the action verb usually is
    const textStr = questionText.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = textStr.split(/\s+/).slice(0, 15); // Look at first 15 words

    // Higher levels override lower levels if multiple exist in the first few words
    const levels = ['C', 'E', 'N', 'P', 'U', 'R'];
    
    // We check from highest taxonomy to lowest
    for (const level of levels) {
        const verbs = bloomVerbs[level];
        for (const verb of verbs) {
            if (words.includes(verb)) {
                return level;
            }
        }
    }

    // Default Fallback
    return 'U';
}

module.exports = {
    determineBloomsTaxonomy,
    bloomVerbs
};
