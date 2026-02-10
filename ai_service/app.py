from flask import Flask, request, jsonify, send_file
from question_selector import QuestionSelector
from pdf_generator import PDFGenerator
import io

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Python AI Service is running'})

@app.route('/generate', methods=['POST'])
def generate_paper():
    """
    Accepts question bank and config, returns selected questions with analytics.
    """
    data = request.json
    questions = data.get('questions', [])
    config = data.get('config', {})
    
    selector = QuestionSelector(questions, config)
    selected_questions, analytics = selector.select()
    
    return jsonify({
        'selected_questions': selected_questions,
        'analytics': analytics
    })

@app.route('/create-pdf', methods=['POST'])
def create_pdf():
    """
    Generates PDF for question paper or summary report.
    """
    data = request.json
    paper = data.get('paper', {})
    pdf_type = data.get('type', 'question_paper')
    
    generator = PDFGenerator(paper)
    
    if pdf_type == 'summary':
        pdf_buffer = generator.create_summary_report()
    else:
        pdf_buffer = generator.create_question_paper()
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"{paper.get('title', 'paper').replace(' ', '_')}.pdf"
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
