# Presentation Prompt — Online Question Paper Generator

Use the following detailed description to create a professional, visually appealing university project presentation (15-20 slides). The project is a **B.Tech / BCA final-year university project**.

---

## Project Title
**Online Question Paper & Summary Report Generator**
*An AI-Powered Web Application for Automated Examination Paper Generation*

## Team / Author
- **Name**: Karan Dhawan
- **Program**: BCA
- **University**: Chitkara University

---

## Slide Structure & Content

### Slide 1: Title Slide
- Project Title: **Online Question Paper & Summary Report Generator**
- Subtitle: An AI-Powered Web Application for Automated Examination Paper Generation
- Student Name, Program, University, Academic Year 2025-26
- Guide/Mentor name (if applicable)

### Slide 2: Problem Statement
- Faculty members manually create question papers — a **time-consuming, error-prone** process
- Ensuring **balanced difficulty distribution** across questions is difficult by hand
- Maintaining alignment with **Course Learning Outcomes (CLOs)** and **Bloom's Taxonomy** levels is tedious
- No centralized **question bank** — questions are scattered across Word documents
- The university-mandated **Revision Summary Sheet** (difficulty %, CLO %, estimated time) must be manually created in Excel
- Risk of **question repetition** across sessional tests

### Slide 3: Objectives
1. Build a centralized, searchable **Question Bank Management System** with bulk import capabilities
2. Enable **AI-powered automated question paper generation** with configurable difficulty distribution
3. Auto-generate university-compliant **Question Paper PDFs** with proper formatting (sections, marks, MCQ options)
4. Auto-generate **Revision Summary Sheets** (Excel) matching the official institutional format with difficulty %, CLO %, and Bloom's Taxonomy mapping
5. Provide **Course Handout (CHO) integration** for automatic topic-CLO-unit mapping
6. Implement **role-based access** (Admin & Faculty) with JWT authentication

### Slide 4: Technology Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React.js + Vite | Single Page Application, responsive UI |
| **Backend** | Node.js + Express.js | REST API, business logic, Excel generation |
| **Database** | MongoDB + Mongoose | Document storage for questions, papers, users |
| **AI Service** | Python + Flask | CHO parsing, AI-powered question bank parsing, PDF generation |
| **AI/ML** | Google Gemini API | Intelligent question extraction, topic assignment, difficulty analysis |
| **Authentication** | JWT (JSON Web Tokens) | Secure role-based access control |
| **PDF Generation** | ReportLab (Python) | Question paper PDF with proper academic formatting |
| **Excel Generation** | ExcelJS (Node.js) | Revision Summary Sheet with formulas, merged cells, formatting |
| **Charts** | Chart.js | Dashboard analytics and statistics visualization |

### Slide 5: System Architecture (show a diagram)
```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (React.js)                 │
│  Dashboard │ Question Bank │ Generate Paper │ Papers│
│  Syllabus Maps │ Login/Register                     │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (HTTP)
┌──────────────────────▼──────────────────────────────┐
│               SERVER (Node.js + Express)            │
│  Auth │ Questions │ Papers │ Syllabus │ Users       │
│  Excel Summary Generator │ Keyword Topic Matcher    │
│  Bloom's Taxonomy Analyzer                          │
└───────┬──────────────────────────┬──────────────────┘
        │ Mongoose                 │ HTTP
┌───────▼───────┐    ┌─────────────▼──────────────────┐
│   MongoDB     │    │     AI Service (Python/Flask)   │
│  • Questions  │    │  • CHO Parser                   │
│  • Papers     │    │  • Q-Bank AI Parser (Gemini)    │
│  • Users      │    │  • Question Selector            │
│  • Syllabus   │    │  • PDF Generator (ReportLab)    │
└───────────────┘    └─────────────────────────────────┘
```

### Slide 6: Feature — Question Bank Management
- **Add/Edit/Delete** individual questions with full metadata (subject, topic, marks, difficulty 1-5, Bloom's level, CLO mapping)
- **Bulk Import** from `.docx` question bank files — AI-powered extraction using Google Gemini
- **Fallback Regex Parser** when AI is unavailable — handles inline MCQs, multi-line MCQs, numbered/unnumbered questions, roman numeral options
- **CSV Import** for structured data
- **Image Support** for questions and MCQ options
- **Content-Based Difficulty Analysis** — questions are analyzed using Bloom's taxonomy verb patterns to assign difficulty levels 1-5 instead of flat marks-based assignment
- **Duplicate Detection** — prevents importing the same question twice
- **Search & Filter** — by subject, unit, difficulty, question type

### Slide 7: Feature — Course Handout (CHO) Integration
- Faculty upload their **CHO document** (`.docx` or `.pdf`)
- System **auto-parses**:
  - Subject name
  - CLO definitions (e.g., "CLO01: Elucidate the basic knowledge of Algorithms...")
  - Topic-to-lecture-number mapping
  - Topic-to-CLO assignments
- Imported questions are **auto-mapped** to CHO topics using keyword-based matching
- Auto-fills **Unit, Lecture Number, CLO** for each question based on the CHO
- CLO definitions are stored and used in the Summary Sheet

### Slide 8: Feature — Intelligent Paper Generation
- Configure: **Subject, Total Marks, Duration, Sections** (MCQ, 2-mark, 3-mark, 5-mark, 10-mark)
- Set **number of questions** and **attempt required** per section
- System selects optimal questions from the question bank
- **Internal choice groups** — questions can be paired as OR choices
- Auto-calculated **total marks** based on configuration
- Generates a structured paper linked to the question bank

### Slide 9: Feature — Question Paper PDF
- Professional, university-standard PDF output
- Includes: University header, exam title, course details, instructions
- Properly formatted **sections** with marks and attempt instructions
- MCQs with **labeled options** (a, b, c, d)
- Section-wise page organization
- Generated via Python's **ReportLab** library

### Slide 10: Feature — Revision Summary Sheet (Excel)
- Auto-generated Excel file matching the **official institutional format**
- Contains:
  - **Question Table**: Question number, lecture number, difficulty level, Bloom's taxonomy letter, CLO mapping, estimated time
  - **MCQ Grouping**: 5 MCQs per row with individual difficulty/CLO values per column
  - **Non-MCQ Questions**: Merged difficulty/CLO cells with single values
  - **Difficulty % Distribution Sidebar**: Percentage of total marks at each difficulty level (1-5)
  - **CLO % Distribution Sidebar**: Percentage of total marks mapped to each CLO
  - **Total Estimated Time** calculation
  - **CLO Descriptions** pulled from the uploaded CHO document
  - **Bloom's Taxonomy Reference Table**
- Cell merging, color-coded sections, proper fonts and borders

### Slide 11: Feature — Content-Based Difficulty Analysis
- Instead of assigning difficulty purely based on marks, the system **analyzes the actual question text**
- Uses **Bloom's Taxonomy verb patterns**:
  - Level 1 (Very Easy): "Define", "Name the", "State" → pure recall
  - Level 2 (Easy): "Which of the following", "What is" → basic understanding
  - Level 3 (Moderate): "Write a program", "Compare", "Explain with example" → application
  - Level 4 (Difficult): "Debug", "Predict output", "Analyze", "Design" → analysis
  - Level 5 (Very Difficult): "Justify", "Evaluate", "Optimize", "Prove" → evaluation/creation
- Applied in both the **AI parser** (Gemini) and the **regex fallback parser**

### Slide 12: Feature — Auto-Fill & Bloom's Taxonomy
- **Bloom's Taxonomy Auto-Detection**: Analyzes question text verbs to assign R/U/P/N/E/C
- **Auto-Fill Pipeline**: When a question is imported, the system auto-fills:
  - Unit (from CHO topic mapping)
  - Lecture Number (from CHO)
  - CLO Mapping (from CHO)
  - Bloom's Taxonomy (from text analysis)
  - Estimated Time (calculated from marks)
  - Difficulty Level (from content analysis)

### Slide 13: Feature — Dashboard & Analytics
- **Statistics Overview**: Total questions, questions by type, by subject, by difficulty
- **Visual Charts** (Chart.js): Bar charts, pie charts for distribution visualization
- **User Management** (Admin): Approve faculty registrations, manage users
- **Role-Based Access**:
  - Admin: Full access, user management, all papers
  - Faculty: Own questions, own papers, own CHOs

### Slide 14: Database Design (ER Diagram / Schema)
- **User**: name, email, password (hashed), role (admin/faculty), memberId, isApproved
- **Question**: text, subject[], topic[], unit, lectureNumber, difficultyLevel (1-5), marks, questionType, options[], bloomsTaxonomy, cloMapping, estimatedTime, image, createdBy
- **Paper**: title, subject, courseCode, totalMarks, duration, questions[], config, createdBy
- **SyllabusMap**: subject, mappings[{topic, unit, lectureNumber, cloMapping}], cloDefinitions, createdBy

### Slide 15: AI Integration Details
- **Google Gemini 1.5 Flash** used for:
  1. **Question Bank Parsing**: Extracts questions, options, marks, topics from unstructured `.docx` files
  2. **Topic Assignment**: Maps questions to official CHO topics
  3. **Difficulty Assessment**: Content-aware difficulty analysis based on cognitive complexity
- **Fallback Mechanism**: When AI is unavailable, a robust **regex-based parser** handles all common question formats
- **Keyword Topic Matcher**: Deterministic matching algorithm as an alternative to AI topic assignment

### Slide 16: Key Technical Challenges & Solutions
| Challenge | Solution |
|-----------|----------|
| Parsing varied question formats (inline MCQ, multi-line, roman numerals) | Multi-strategy regex parser with 6 detection patterns |
| AI service unavailability | Graceful fallback to deterministic regex parser |
| Matching questions to CHO topics | Keyword overlap scoring algorithm |
| Generating university-standard Excel reports | ExcelJS with 70+ merged cell regions, conditional formatting |
| Accurate difficulty assignment | Bloom's taxonomy verb pattern analysis on question text |
| MCQ option cleanup (stripping a, b, c, d prefixes) | Regex-based prefix stripping at import time + DB migration |

### Slide 17: Screenshots / Demo
- Show screenshots of:
  1. **Login Page**
  2. **Dashboard** with charts
  3. **Question Bank** — list view with filters
  4. **Import Q-Bank** modal — uploading a `.docx` file
  5. **Generate Paper** — configuration form
  6. **My Papers** — list with PDF/Summary Excel buttons
  7. **Generated PDF** — the question paper output
  8. **Summary Sheet** — the Excel output matching institutional format
  9. **Syllabus Maps** — CHO upload and topic listing

### Slide 18: Testing & Validation
- Tested with real university question banks (Programming Essentials, Data Structures)
- Verified Summary Sheet output against manually created reference sheets
- Validated with 100+ MCQs, 37 three-mark questions, 19 five-mark questions from real exam papers
- Content-based difficulty analyzer tested with diverse question types
- Cross-verified CLO definitions extracted from CHO documents

### Slide 19: Future Scope
1. **Answer Key Generation** — auto-generate answer keys alongside question papers
2. **Question Paper History** — track which questions were used in which exam to prevent repetition
3. **Multi-Language Support** — Hindi and regional language question papers
4. **Advanced Analytics** — CLO attainment tracking across multiple exams
5. **Mobile App** — React Native version for on-the-go paper review
6. **Integration with LMS** — Moodle/Canvas integration for online exam deployment
7. **OCR-Based Import** — Parse scanned/handwritten question papers

### Slide 20: Conclusion
- Successfully developed a **full-stack, AI-powered** web application that automates the entire question paper lifecycle
- Reduces paper creation time from **hours to minutes**
- Ensures **institutional compliance** with auto-generated Summary Sheets matching official formats
- **Intelligent difficulty analysis** using NLP and Bloom's taxonomy
- **Modular microservice architecture** enabling independent scaling of AI and web services
- Complete **CHO integration** ensures curriculum alignment

### Slide 21: References
- React.js Documentation — https://react.dev
- Node.js & Express.js — https://expressjs.com
- MongoDB & Mongoose — https://mongoosejs.com
- Google Gemini API — https://ai.google.dev
- ReportLab — https://www.reportlab.com
- ExcelJS — https://github.com/exceljs/exceljs
- Bloom's Taxonomy — Anderson & Krathwohl (2001)
- Chart.js — https://www.chartjs.org

---

## Presentation Style Guidelines
- Use a **modern, professional template** with dark blue / white / accent color theme
- Include **diagrams** for architecture, data flow, and ER diagrams
- Use **icons** for feature highlights
- Keep text **concise** — bullet points, not paragraphs
- Add **screenshots** from the actual running application
- Use **before/after comparisons** (manual process vs. automated)
- Include a **live demo** slide if presenting in person
