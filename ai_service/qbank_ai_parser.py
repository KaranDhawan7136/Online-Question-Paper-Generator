"""
AI-powered Q-Bank parser using Google Gemini.
Parses any .docx question bank and assigns topics to each question.
Falls back gracefully if Gemini is unavailable.
"""

import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


def call_gemini(prompt: str) -> str:
    """Call Gemini API and return the text response."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
        }
    }
    resp = requests.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        json=payload,
        headers=headers,
        timeout=60
    )
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def extract_json_from_response(text: str) -> list:
    """Extract JSON array from Gemini response (handles markdown code fences)."""
    text = re.sub(r'```(?:json)?\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    start = text.find('[')
    end = text.rfind(']')
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in response")
    return json.loads(text[start:end+1])


def parse_qbank_with_ai(raw_text: str, subject: str, cho_topics: list = None) -> dict:
    """
    Use Gemini to parse the question bank and assign topics.

    Args:
        raw_text: Raw text extracted from the .docx file
        subject: Subject name (e.g., "Programming Essentials")
        cho_topics: List of topic names from the user's CHO (optional)

    Returns:
        dict with keys: questions (list), stats (dict), errors (list), ai_used (bool)
    """
    if not GEMINI_API_KEY:
        return {
            "questions": [], "stats": {},
            "errors": ["Gemini API key not configured"],
            "ai_used": False
        }

    # Build topic context
    if cho_topics and len(cho_topics) > 0:
        topics_str = "\n".join(f"  - {t}" for t in cho_topics[:60])
        topic_context = f"""
The subject '{subject}' has these official topics from the Course Handout (CHO).
Assign each question the best matching official topic (use exact spelling from the list):
{topics_str}
If no official topic fits, infer a topic from the question content.
"""
    else:
        topic_context = f"""
Based on the content of each question, assign an appropriate topic name.
For example: 'Arrays', 'Loops', 'Operators', 'Functions', 'Pointers', 'Data Types', etc.
"""

    # Trim text to fit in context window
    text_to_send = raw_text[:14000]

    prompt = f"""You are an expert computer science educator. Parse the following question bank document for subject: {subject}.

{topic_context}

DOCUMENT:
---
{text_to_send}
---

Extract EVERY question from the document. Include MCQs, descriptive, code-based, and match-the-following questions.

Rules:
1. Extract ALL questions without skipping any
2. For INLINE MCQ format "Question text?(a) opt1 (b) opt2 (c) opt3 (d) opt4" — split correctly
3. For MULTI-LINE MCQ with A)/B)/C)/D) on separate lines — combine properly  
4. Detect marks from section headers: "Section A – 1 Marks" → marks=1 type=MCQ, "Section B – 3 Marks" → marks=3 type="3 Mark", "5 Marks Questions" → marks=5 type="5 Mark"
5. For MCQ: options array must have 4 items with ONLY the option text (NO letter prefixes like A), B), a., (a), etc.)
6. For descriptive: options = []
7. questionType must be exactly one of: "MCQ", "2 Mark", "3 Mark", "5 Mark", "10 Mark"
8. Assign a topic to every single question
9. difficultyLevel (1-5) — Analyze the ACTUAL CONTENT of each question to determine difficulty:
   - 1 (Very Easy): Pure recall/definition — "What is X?", "Define X", direct fact lookup
   - 2 (Easy): Basic understanding/recognition — "Which of the following is true?", identify correct syntax, simple MCQs
   - 3 (Moderate): Application/comparison — "Write a program to...", "Compare X and Y", "Explain with example", multi-concept questions
   - 4 (Difficult): Analysis/design — "Design a solution", "Analyze the output", "Debug this code", predict output, multi-step problems
   - 5 (Very Difficult): Evaluation/creation — "Justify", "Evaluate", "Develop an optimized solution", complex algorithms, proofs, design patterns
   Do NOT just assign based on marks. A 1-mark MCQ about predicting output of complex code is difficulty 4, not 2.
10. Include code snippets as part of the question text

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {{"text": "question text", "questionType": "MCQ", "marks": 1, "options": ["option1 text only", "option2 text only", "option3 text only", "option4 text only"], "correctAnswer": "", "topic": "Topic Name", "difficultyLevel": 2}},
  {{"text": "descriptive question", "questionType": "3 Mark", "marks": 3, "options": [], "correctAnswer": "", "topic": "Topic Name", "difficultyLevel": 3}}
]"""

    try:
        response_text = call_gemini(prompt)
        questions_raw = extract_json_from_response(response_text)

        questions = []
        stats = {}

        for q in questions_raw:
            if not q.get("text") or len(str(q["text"]).strip()) < 5:
                continue

            marks = int(q.get("marks", 1))
            qt = str(q.get("questionType", "MCQ")).strip()

            # Normalize questionType
            valid_types = ["MCQ", "2 Mark", "3 Mark", "5 Mark", "10 Mark"]
            if qt not in valid_types:
                if marks == 1: qt = "MCQ"
                elif marks == 2: qt = "2 Mark"
                elif marks == 3: qt = "3 Mark"
                elif marks == 5: qt = "5 Mark"
                elif marks >= 10: qt = "10 Mark"
                else: qt = f"{marks} Mark"

            options = q.get("options", [])
            if not isinstance(options, list):
                options = []
            # Strip any letter/number prefixes from options (A), a., (a), i), etc.)
            cleaned_options = []
            for o in options:
                if o:
                    opt_text = str(o).strip()
                    opt_text = re.sub(r'^\s*(?:\(?[a-dA-D]\)?[.)\s]|(?:i{1,3}|iv)\s*[.)]\s*)\s*', '', opt_text, flags=re.IGNORECASE).strip()
                    if opt_text:
                        cleaned_options.append(opt_text)
            options = cleaned_options

            topic = str(q.get("topic", "")).strip()

            normalized = {
                "text": str(q["text"]).strip(),
                "questionType": qt,
                "marks": marks,
                "options": options,
                "correctAnswer": str(q.get("correctAnswer", "")),
                "topic": topic,
                "difficultyLevel": int(q.get("difficultyLevel", 2))
            }
            questions.append(normalized)

            stats[qt] = stats.get(qt, 0) + 1

        return {
            "questions": questions,
            "stats": stats,
            "errors": [],
            "ai_used": True
        }

    except Exception as e:
        return {
            "questions": [],
            "stats": {},
            "errors": [f"Gemini parsing failed: {str(e)}"],
            "ai_used": False
        }
