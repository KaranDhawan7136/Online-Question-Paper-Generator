const fs = require('fs');
const { parseQuestionBank } = require('./utils/qbankParser');
const text = fs.readFileSync('./debug_qbank.txt', 'utf8');
const res = parseQuestionBank(text, 'Programming Essentials');
console.log('Total:', res.questions.length);
console.log('Stats:', JSON.stringify(res.stats));
console.log('Errors:', JSON.stringify(res.errors));
const mcq = res.questions.filter(q => q.questionType === 'MCQ').length;
const m3 = res.questions.filter(q => q.questionType === '3 Mark').length;
const m5 = res.questions.filter(q => q.questionType === '5 Mark').length;
console.log('MCQ:', mcq, '| 3Mark:', m3, '| 5Mark:', m5);
if (res.questions.length > 0) {
    console.log('Sample Q1:', JSON.stringify(res.questions[0]).substring(0, 200));
    console.log('Sample Q2:', JSON.stringify(res.questions[Math.min(5, res.questions.length-1)]).substring(0, 200));
}
process.exit(0);
