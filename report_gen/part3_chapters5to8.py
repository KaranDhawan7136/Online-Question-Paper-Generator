"""Part 3: Content - Chapters 5-8 and Bibliography"""
from part1_setup import *

def build_chapter5(doc):
    doc.add_heading('Chapter 5: Design', level=1)
    
    # 5.1 System Architecture
    doc.add_heading('5.1 System Architecture', level=2)
    add_para(doc, 'The system follows a three-tier microservice architecture that separates concerns across three independent services communicating via RESTful APIs. A core design principle is the hybrid AI-manual approach: the AI microservice augments the workflow with intelligent parsing and analysis, while the backend provides deterministic, manual-control pathways (regex parsing, direct CRUD, configurable generation) ensuring the system is fully functional with or without AI availability.', align='justify')
    add_image_with_caption(doc, 'System Architecture Design.png', 'System Architecture (Three-Tier Microservices)', '5.1')
    
    add_para(doc, 'The architecture comprises the following tiers:', align='justify')
    tiers = [
        ('Presentation Tier (Client)', 'React.js SPA built with Vite, providing responsive UI components for both AI-assisted operations (bulk import, auto-fill) and manual workflows (Dashboard, Question Bank CRUD, Paper Configuration, Administration).'),
        ('Application Tier (Server)', 'Node.js/Express.js backend handling business logic, authentication (JWT + Google OAuth), manual CRUD operations, regex-based fallback parsing, Excel generation, and Bloom\'s Taxonomy verb-pattern analysis.'),
        ('Data & AI Tier', 'MongoDB for persistent storage and Python/Flask microservice for AI-powered parsing (Google Gemini), PDF generation (ReportLab), and intelligent question selection. This tier augments the manual system \u2014 the backend\'s regex parser serves as a reliable fallback when AI is unavailable.')
    ]
    for i, (title, desc) in enumerate(tiers, 1):
        p = doc.add_paragraph()
        r = p.add_run(f'{i}. {title}: ')
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        r2 = p.add_run(desc)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(12)
        p.paragraph_format.left_indent = Cm(1.27)

    # 5.2 Database Schema
    doc.add_heading('5.2 Database Schema', level=2)
    add_para(doc, 'The MongoDB database uses a document-oriented schema with four primary collections. The Entity-Relationship diagram below illustrates the relationships between these collections.', align='justify')
    add_image_with_caption(doc, 'Database ER Diagram.png', 'Database ER Diagram', '5.2')
    add_image_with_caption(doc, 'Entity Relationship (ER).png', 'Entity-Relationship Diagram', '5.3')

    # Database collections
    doc.add_heading('5.2.1 User Collection', level=3)
    add_table(doc, ['Field', 'Type', 'Description'], [
        ['name', 'String', 'User full name'],
        ['email', 'String', 'Unique email address'],
        ['password', 'String', 'Bcrypt hashed password'],
        ['role', 'String', 'admin or faculty'],
        ['isApproved', 'Boolean', 'Admin approval status'],
        ['googleId', 'String', 'Google OAuth identifier']
    ], '5.1', 'User Collection Schema')

    doc.add_heading('5.2.2 Question Collection', level=3)
    add_table(doc, ['Field', 'Type', 'Description'], [
        ['text', 'String', 'Question text (required)'],
        ['subject', 'Array[String]', 'Subject name(s)'],
        ['marks', 'Number', 'Question marks (1, 3, or 5)'],
        ['difficulty', 'Number', 'Difficulty level (1\u20135)'],
        ['bloomsLevel', 'String', 'Bloom\'s Taxonomy level'],
        ['unit', 'Number', 'Course unit number'],
        ['cloMapping', 'String', 'Course Learning Outcome mapping'],
        ['topic', 'String', 'Topic within the course'],
        ['estimatedTime', 'Number', 'Time in minutes'],
        ['options', 'Array[String]', 'MCQ options (for 1-mark questions)'],
        ['correctAnswer', 'String', 'Correct answer'],
        ['tags', 'Array[String]', 'Searchable tags'],
        ['createdBy', 'ObjectId', 'Reference to User'],
        ['importSource', 'String', 'Source file of import']
    ], '5.2', 'Question Collection Schema')

    doc.add_heading('5.2.3 Paper Collection', level=3)
    add_table(doc, ['Field', 'Type', 'Description'], [
        ['title', 'String', 'Exam title'],
        ['universityName', 'String', 'Institution name'],
        ['courseName', 'String', 'Course/subject name'],
        ['courseCode', 'String', 'Course code'],
        ['examType', 'String', 'Sessional/End-term'],
        ['totalMarks', 'Number', 'Total paper marks'],
        ['duration', 'Number', 'Exam duration in minutes'],
        ['sections', 'Array[Object]', 'Paper sections with questions'],
        ['createdBy', 'ObjectId', 'Reference to User'],
        ['difficultyDistribution', 'Object', 'Difficulty level percentages']
    ], '5.3', 'Paper Collection Schema')

    doc.add_heading('5.2.4 SyllabusMap Collection', level=3)
    add_table(doc, ['Field', 'Type', 'Description'], [
        ['subject', 'String', 'Subject name'],
        ['mappings', 'Array[Object]', 'topic, unit, lectureNumber, cloMapping'],
        ['cloDescriptions', 'Object', 'CLO number to description mapping'],
        ['createdBy', 'ObjectId', 'Reference to User']
    ], '5.4', 'SyllabusMap Collection Schema')

    # 5.3 UML and Use Case Diagrams
    doc.add_heading('5.3 UML and Use Case Diagrams', level=2)
    add_para(doc, 'The following diagrams illustrate the system\'s object-oriented design and actor interactions.', align='justify')
    add_image_with_caption(doc, 'UML Diagram.png', 'UML Class Diagram', '5.4')
    add_image_with_caption(doc, 'Use Case Diagram.png', 'Use Case Diagram', '5.5')

    # 5.4 Data Flow Diagrams
    doc.add_heading('5.4 Data Flow Diagrams (DFD)', level=2)
    add_para(doc, 'The Data Flow Diagrams below illustrate how information moves through the Question Paper & Summary Report Generator. The Level 0 (Context) diagram shows the system as a single process with external entities, while the Level 1 and Level 2 diagrams decompose it into the core sub-processes.', align='justify')

    doc.add_heading('5.4.1 DFD Level 0 \u2014 Context Diagram', level=3)
    add_image_with_caption(doc, 'Level 0 DFD.png', 'DFD Level 0: System context with Faculty, Admin, and Google Gemini AI', '5.6')

    doc.add_heading('5.4.2 DFD Level 1 \u2014 Detailed Process Flow', level=3)
    add_image_with_caption(doc, 'Level 1 DFD.png', 'DFD Level 1: Authentication, Question Bank, AI Import, Paper Generation, PDF Generation, Summary Sheet, and User Administration', '5.7')

    doc.add_heading('5.4.3 DFD Level 2 \u2014 Sub-Process Decomposition', level=3)
    add_image_with_caption(doc, 'Level 2 DFD.png', 'DFD Level 2: Detailed sub-process decomposition', '5.8')

    # 5.5 Sequence and Flow Diagrams
    doc.add_heading('5.5 Sequence and Flow Diagrams', level=2)
    
    doc.add_heading('5.5.1 Sequence Diagram', level=3)
    add_image_with_caption(doc, 'Sequence Diagram.png', 'System Sequence Diagram', '5.9')

    doc.add_heading('5.5.2 System Flowchart', level=3)
    add_image_with_caption(doc, 'FlowChart.png', 'System Flowchart', '5.10')

    doc.add_heading('5.5.3 Google OAuth Sign-In Flow', level=3)
    add_image_with_caption(doc, 'Google O Auth Sign in flow.png', 'Google OAuth 2.0 Sign-In Flow', '5.11')

    doc.add_heading('5.5.4 Question Paper Generation Flow', level=3)
    add_image_with_caption(doc, 'Question Paper Generation flow.png', 'Question Paper Generation Workflow', '5.12')


def build_chapter6(doc):
    doc.add_heading('Chapter 6: Testing', level=1)
    
    doc.add_heading('6.1 Functional Testing', level=2)
    add_para(doc, 'Functional testing was conducted to verify that all features of the application work as expected. The following test cases were executed:', align='justify')
    
    add_table(doc, ['Test Case', 'Input', 'Expected Output', 'Status'], [
        ['User Registration', 'Register with valid credentials', 'User created, JWT returned', 'Pass'],
        ['User Login', 'Login with correct credentials', 'JWT token returned', 'Pass'],
        ['Google OAuth Login', 'Sign in with Google account', 'User authenticated via OAuth', 'Pass'],
        ['Add Question', 'Create question with all metadata', 'Question saved to database', 'Pass'],
        ['Bulk Import (.docx)', 'Upload question bank document', '95%+ questions extracted correctly', 'Pass'],
        ['CSV Import', 'Upload CSV with questions', 'All questions imported', 'Pass'],
        ['Generate Paper', 'Configure sections and difficulty', 'Paper generated with correct distribution', 'Pass'],
        ['Download PDF', 'Request PDF for generated paper', 'University-formatted PDF downloaded', 'Pass'],
        ['Summary Sheet', 'Request summary for paper', 'Excel file with correct formulas', 'Pass']
    ], '6.1', 'Functional Test Cases')

    doc.add_heading('6.2 Performance Testing', level=2)
    add_para(doc, 'The application was tested with real university question banks containing 100+ MCQs, 37 three-mark questions, and 19 five-mark questions. Key performance results:', align='justify')
    perf_results = [
        'Paper generation completed within 3 seconds.',
        'PDF generation completed within 8 seconds including network round-trip.',
        'Question bank page loads within 1.5 seconds with 150+ questions.',
        'Dashboard renders with charts in under 2 seconds.',
        'Bulk import processes 100+ questions in under 15 seconds.'
    ]
    for r in perf_results:
        add_bullet(doc, r)

    doc.add_heading('6.3 Stress Testing', level=2)
    add_para(doc, 'The system was tested with concurrent API requests and large question bank imports. The regex fallback parser ensures system availability even when the AI service is unavailable. Key stress testing observations:', align='justify')
    stress = [
        'System handles up to 20 concurrent users without degradation.',
        'AI service timeout gracefully falls back to regex parser.',
        'MongoDB Atlas handles concurrent read/write operations efficiently.',
        'Frontend remains responsive during background API operations.'
    ]
    for s in stress:
        add_bullet(doc, s)


def build_chapter7(doc):
    doc.add_heading('Chapter 7: Implementation / Conversion Plan', level=1)
    
    doc.add_heading('7.1 Deployment Architecture', level=2)
    add_para(doc, 'The application is deployed on Render.com with the following configuration:', align='justify')
    
    add_table(doc, ['Component', 'Platform', 'Details'], [
        ['Frontend (React)', 'Render.com Static Site', 'Vite build output served via CDN'],
        ['Backend (Node.js)', 'Render.com Web Service', 'Express.js server with environment variables'],
        ['AI Service (Python)', 'Render.com Web Service', 'Flask server with Gunicorn'],
        ['Database', 'MongoDB Atlas', 'M0 Free Tier, cloud-hosted cluster']
    ], '7.1', 'Deployment Architecture')

    doc.add_heading('7.2 Environment Variables', level=2)
    add_para(doc, 'The following environment variables are configured for secure deployment:', align='justify')
    add_table(doc, ['Variable', 'Purpose'], [
        ['MONGODB_URI', 'MongoDB Atlas connection string'],
        ['JWT_SECRET', 'Secret key for JWT token signing'],
        ['GEMINI_API_KEY', 'Google Gemini API authentication key'],
        ['AI_SERVICE_URL', 'URL of the Python AI microservice'],
        ['GOOGLE_CLIENT_ID', 'Google OAuth 2.0 client identifier']
    ], '7.2', 'Environment Variables')

    doc.add_heading('7.3 Deployment Process', level=2)
    steps = [
        'Push code to GitHub repository (main branch).',
        'Render.com automatically detects changes and triggers build.',
        'Frontend: Vite builds static assets and deploys to CDN.',
        'Backend: Node.js server starts with environment variables injected.',
        'AI Service: Python Flask server starts with Gunicorn WSGI.',
        'MongoDB Atlas connection is established on service startup.',
        'Health checks verify all services are operational.'
    ]
    for i, step in enumerate(steps, 1):
        p = doc.add_paragraph()
        r = p.add_run(f'Step {i}: ')
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        r2 = p.add_run(step)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(12)
        p.paragraph_format.left_indent = Cm(1.27)


def build_chapter8(doc):
    doc.add_heading('Chapter 8: Project Legacy', level=1)
    
    doc.add_heading('8.1 Current Status of Project', level=2)
    add_para(doc, 'The project is fully functional and deployed as a hybrid AI-manual system. All core features including manual question bank management, AI-powered bulk import with regex fallback, configurable paper generation, PDF output, and summary sheet generation are operational. The hybrid approach ensures uninterrupted service \u2014 faculty can work entirely through manual interfaces or leverage AI assistance as needed. The system is deployed on Render.com with MongoDB Atlas as the cloud database.', align='justify')
    
    status_items = [
        'Live deployment accessible at online-question-paper-generator.onrender.com',
        'All authentication flows (JWT + Google OAuth) are functional',
        'Question bank supports 150+ questions across multiple subjects',
        'PDF generation produces university-standard formatted papers',
        'Summary sheet matches the official institutional Excel format',
        'Dashboard provides real-time analytics and statistics'
    ]
    for item in status_items:
        add_bullet(doc, item)

    doc.add_heading('8.2 Remaining Areas of Concern', level=2)
    concerns = [
        ('Scalability', 'The free tier of MongoDB Atlas has storage limitations (512 MB).'),
        ('AI Rate Limits', 'Google Gemini API free tier has request quota limitations.'),
        ('Image Storage', 'Currently uses local file system; cloud storage (e.g., AWS S3) would be more scalable.')
    ]
    for i, (title, desc) in enumerate(concerns, 1):
        p = doc.add_paragraph()
        r = p.add_run(f'{chr(96+i)}) {title}: ')
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        r2 = p.add_run(desc)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(12)
        p.paragraph_format.left_indent = Cm(1.27)

    doc.add_heading('8.3 Technical and Managerial Lessons Learnt', level=2)
    lessons = [
        'The hybrid AI-manual approach proved highly effective \u2014 AI accelerates bulk operations while manual controls ensure quality and reliability.',
        'Microservice architecture provides excellent separation of concerns but adds deployment complexity.',
        'AI-powered parsing significantly reduces manual effort but requires robust fallback mechanisms (regex parser) for production reliability.',
        'MongoDB\'s document-oriented model is well-suited for flexible question schemas.',
        'Proper error handling and validation are critical for user-facing applications.',
        'Environment variable management is crucial for secure multi-environment deployment.',
        'The fallback-first design philosophy (always have a manual/deterministic alternative to AI features) ensures zero downtime regardless of external service availability.'
    ]
    for i, lesson in enumerate(lessons, 1):
        add_numbered(doc, lesson)

    doc.add_heading('8.4 Future Recommendations', level=2)
    recommendations = [
        ('Answer Key Generation', 'Auto-generate answer keys alongside question papers.'),
        ('Question Paper History', 'Track question usage across exams to prevent repetition.'),
        ('Multi-Language Support', 'Hindi and regional language question papers.'),
        ('Advanced Analytics', 'CLO attainment tracking across multiple examinations.'),
        ('Mobile Application', 'React Native version for on-the-go paper review.'),
        ('LMS Integration', 'Moodle/Canvas integration for online exam deployment.'),
        ('OCR-Based Import', 'Parse scanned or handwritten question papers.')
    ]
    for i, (title, desc) in enumerate(recommendations, 1):
        p = doc.add_paragraph()
        r = p.add_run(f'{i}. {title} \u2014 ')
        r.bold = True
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        r2 = p.add_run(desc)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(12)
        p.paragraph_format.left_indent = Cm(1.27)


def build_bibliography(doc):
    doc.add_heading('Bibliography', level=1)
    refs = [
        '[1] React.js Documentation. Available at: https://react.dev [Accessed: May 2026]',
        '[2] Node.js Documentation. Available at: https://nodejs.org [Accessed: May 2026]',
        '[3] Express.js Documentation. Available at: https://expressjs.com [Accessed: May 2026]',
        '[4] MongoDB & Mongoose Documentation. Available at: https://mongoosejs.com [Accessed: May 2026]',
        '[5] Google Gemini API Documentation. Available at: https://ai.google.dev [Accessed: May 2026]',
        '[6] ReportLab Documentation. Available at: https://www.reportlab.com [Accessed: May 2026]',
        '[7] ExcelJS Documentation. Available at: https://github.com/exceljs/exceljs [Accessed: May 2026]',
        '[8] Chart.js Documentation. Available at: https://www.chartjs.org [Accessed: May 2026]',
        '[9] Vite Documentation. Available at: https://vitejs.dev [Accessed: May 2026]',
        '[10] Anderson, L.W. and Krathwohl, D.R. (2001) A Taxonomy for Learning, Teaching, and Assessing. New York: Longman.',
        '[11] Flask Documentation. Available at: https://flask.palletsprojects.com [Accessed: May 2026]',
        '[12] JWT.io \u2014 JSON Web Token Introduction. Available at: https://jwt.io [Accessed: May 2026]'
    ]
    for ref in refs:
        p = doc.add_paragraph(ref)
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-1.27)
        for run in p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)

print("Part 3 loaded successfully.")
