from flask import Flask, request, jsonify, send_file
from question_selector import QuestionSelector
from pdf_generator import PDFGenerator
from cho_parser import parse_cho
from qbank_ai_parser import parse_qbank_with_ai
import io
import os
import tempfile

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

@app.route('/parse-cho', methods=['POST'])
def parse_cho_endpoint():
    """
    Accepts a CHO file upload (PDF or DOCX), parses it, and returns
    structured syllabus mapping JSON.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get file extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ('pdf', 'docx'):
        return jsonify({'error': f'Unsupported file type: .{ext}. Use .docx or .pdf'}), 400
    
    # Save to temp file
    temp_fd, temp_path = tempfile.mkstemp(suffix=f'.{ext}')
    try:
        file.save(temp_path)
        result = parse_cho(temp_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.close(temp_fd)
        os.unlink(temp_path)

@app.route('/parse-qbank', methods=['POST'])
def parse_qbank_endpoint():
    """
    Accepts raw question bank text + subject + CHO topics.
    Uses Gemini AI to extract all questions and assign topics.
    Falls back to error if AI is unavailable.
    """
    data = request.json
    raw_text = data.get('rawText', '')
    subject = data.get('subject', 'Unknown')
    cho_topics = data.get('choTopics', [])  # list of topic strings from user's CHO

    if not raw_text:
        return jsonify({'error': 'No text provided'}), 400

    result = parse_qbank_with_ai(raw_text, subject, cho_topics)
    return jsonify(result)

@app.route('/assign-topics', methods=['POST'])
def assign_topics_endpoint():
    """
    Accepts question texts + subject + CHO topics.
    Uses Gemini REST API with retry and key rotation for rate limits.
    """
    import json
    import time
    import requests as req
    from dotenv import load_dotenv
    load_dotenv()

    data = request.json
    questions = data.get('questions', [])
    subject = data.get('subject', 'Unknown')
    cho_topics = data.get('choTopics', [])

    if not questions:
        return jsonify({'error': 'No questions provided'}), 400

    # Support multiple API keys for rotation
    api_key = os.environ.get('GEMINI_API_KEY', '')
    api_keys = [k.strip() for k in api_key.split(',') if k.strip()]
    if not api_keys:
        print("  ERROR: No GEMINI_API_KEY in .env")
        return jsonify({'topics': [], 'error': 'No GEMINI_API_KEY'}), 200

    print(f"  {len(api_keys)} API key(s) loaded")

    # Shorten CHO topic names
    short_topics = []
    for t in cho_topics:
        if ':' in t:
            short_topics.append(t.split(':')[0].strip())
        elif ',' in t:
            short_topics.append(t.split(',')[0].strip())
        else:
            short_topics.append(' '.join(t.strip().split()[:4]))
    short_topics = list(set(short_topics))
    print(f"  CHO topics: {short_topics}")

    all_topics = [''] * len(questions)
    BATCH = 50

    for start in range(0, len(questions), BATCH):
        end = min(start + BATCH, len(questions))
        batch = questions[start:end]

        summaries = []
        for i, q in enumerate(batch):
            text = (q.get('text', '') or '')[:200]
            qtype = q.get('questionType', 'MCQ')
            summaries.append(f"{i+1}. [{qtype}] {text}")

        if short_topics:
            hint = "\nYou MUST assign each question one of these official CHO topics (use EXACT names):\n"
            hint += "\n".join(f'  {i+1}. "{t}"' for i, t in enumerate(short_topics))
            hint += "\nPick the one that best matches what the question tests.\n"
        else:
            hint = "\nAssign concise topic names (2-4 words) like 'Arrays', 'Loops', 'Operators', 'Functions', 'Data Types'.\n"

        prompt = f"""You are a computer science educator. For each question below, determine the most appropriate TOPIC based on what the question actually tests.

Subject: {subject}
{hint}
Questions:
{chr(10).join(summaries)}

Return ONLY a JSON array of topic strings, one per question, in the same order. The array must have exactly {len(batch)} elements.
Example: ["Arrays", "Conditional Statements", "Data Types"]

No markdown, no explanation, just the JSON array:"""

        # Retry with key rotation
        for attempt in range(5):
            key = api_keys[attempt % len(api_keys)]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
            try:
                print(f"  Batch {start+1}-{end} (attempt {attempt+1}, key ...{key[-6:]})...")
                resp = req.post(url, json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 4096}
                }, timeout=30)

                if resp.status_code == 429:
                    wait = 35 * (attempt + 1)
                    print(f"    Rate limited (429), waiting {wait}s...")
                    time.sleep(wait)
                    continue

                if resp.status_code != 200:
                    print(f"    Error {resp.status_code}: {resp.text[:100]}")
                    time.sleep(5)
                    continue

                result = resp.json()
                text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                text = text.replace('```json', '').replace('```', '').strip()
                idx_start = text.index('[')
                idx_end = text.rindex(']') + 1
                topics = json.loads(text[idx_start:idx_end])
                for i, t in enumerate(topics):
                    if start + i < len(all_topics) and isinstance(t, str) and 1 < len(t) < 80:
                        all_topics[start + i] = t.strip()
                print(f"  ✓ Batch {start+1}-{end}: {len(topics)} topics assigned")
                break
            except Exception as e:
                print(f"  ✗ Batch {start+1}-{end} attempt {attempt+1} failed: {str(e)[:100]}")
                if attempt < 4:
                    time.sleep(10)

        # Delay between batches
        if end < len(questions):
            time.sleep(5)

    assigned = sum(1 for t in all_topics if t)
    print(f"  DONE: {assigned}/{len(questions)} topics assigned")
    return jsonify({'topics': all_topics})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

