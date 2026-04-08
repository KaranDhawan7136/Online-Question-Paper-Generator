/**
 * AI Topic Assigner - Routes through Python AI service
 * 
 * Sends questions to the Python service which calls Gemini
 * to analyze content and assign CHO-aligned topics.
 */

const axios = require('axios');

const AI_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Assign topics to questions using AI via Python service.
 * 
 * @param {Array} questions - Array of question objects (must have .text field)
 * @param {string} subject - Subject name
 * @param {Array} choTopics - Optional list of CHO topic names to prefer
 * @returns {Array|null} - Array of topic strings, one per question, or null if unavailable
 */
async function assignTopicsWithAI(questions, subject, choTopics = []) {
    if (questions.length === 0) return null;

    // Prepare minimal question data for the Python service
    const qData = questions.map(q => ({
        text: (typeof q.text === 'string' ? q.text : '').substring(0, 250),
        questionType: q.questionType || 'MCQ'
    }));

    try {
        console.log(`  Calling Python AI service for ${qData.length} questions...`);
        const response = await axios.post(`${AI_SERVICE_URL}/assign-topics`, {
            questions: qData,
            subject,
            choTopics
        }, { timeout: 300000 }); // 5 min timeout (retries for rate limits)

        const topics = response.data.topics;
        if (Array.isArray(topics) && topics.length > 0) {
            const assigned = topics.filter(t => t && t.length > 1).length;
            console.log(`  Python service assigned ${assigned}/${questions.length} topics`);
            return topics;
        }
        
        console.log('  Python service returned empty topics');
        return null;
    } catch (error) {
        console.log('  Python AI topic service error:', error.message);
        return null;
    }
}

module.exports = { assignTopicsWithAI };
