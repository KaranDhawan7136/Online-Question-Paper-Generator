from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from collections import defaultdict
import io
import os
import requests
import tempfile

class PDFGenerator:
    """
    PDF Generator for Question Papers and Summary Reports.
    Formats papers like university examination papers with logo and proper headers.
    """
    
    # Base URL for downloading question images from the Node.js server
    SERVER_BASE_URL = os.environ.get('NODE_SERVER_URL', 'http://localhost:5000')
    
    def __init__(self, paper):
        self.paper = paper
        self._temp_files = []  # Track temp files for cleanup
        # University/Institution Details
        self.university_name = paper.get('universityName', 'University Name')
        self.logo_path = paper.get('logoPath', None)
        self.academic_year = paper.get('academicYear', '2025-2026')
        
        # Exam Details
        self.title = paper.get('title', 'Question Paper')
        self.semester = paper.get('semester', '')
        
        # Course Details
        self.programme_name = paper.get('programmeName', '')
        self.course_title = paper.get('courseTitle', paper.get('subject', 'General'))
        self.course_code = paper.get('courseCode', '')
        self.subject = paper.get('subject', 'General')
        
        # Paper Configuration
        self.total_marks = paper.get('totalMarks', 100)
        self.duration = paper.get('duration', 180)
        self.total_pages = paper.get('totalPages', 2)
        self.instructions = paper.get('instructions', [])
        self.questions = paper.get('questions', [])
        
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _download_image(self, image_path, max_width=4*inch, max_height=2.5*inch):
        """Download an image from the server and return a ReportLab Image element."""
        if not image_path:
            return None
        try:
            # Build full URL from relative path
            url = f"{self.SERVER_BASE_URL}{image_path}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Save to temp file (ReportLab needs a file path or file-like object)
            suffix = os.path.splitext(image_path)[1] or '.png'
            temp_fd, temp_path = tempfile.mkstemp(suffix=suffix)
            os.write(temp_fd, response.content)
            os.close(temp_fd)
            self._temp_files.append(temp_path)
            
            # Create Image element with constrained dimensions
            img = Image(temp_path)
            # Scale to fit within max dimensions while preserving aspect ratio
            iw, ih = img.drawWidth, img.drawHeight
            if iw > 0 and ih > 0:
                ratio = min(max_width / iw, max_height / ih, 1.0)
                img.drawWidth = iw * ratio
                img.drawHeight = ih * ratio
            return img
        except Exception as e:
            print(f"Warning: Could not load image {image_path}: {e}")
            return None
    
    def _cleanup_temp_files(self):
        """Remove temporary image files."""
        for path in self._temp_files:
            try:
                os.unlink(path)
            except:
                pass
        self._temp_files = []
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='UniversityHeader',
            parent=self.styles['Heading1'],
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=4,
            textColor=colors.black,
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='ExamTitle',
            parent=self.styles['Heading2'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=6,
            textColor=colors.black,
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='SemesterText',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_CENTER,
            spaceAfter=8,
            textColor=colors.black
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=11,
            alignment=TA_CENTER,
            spaceBefore=14,
            spaceAfter=6,
            textColor=colors.black,
            fontName='Helvetica-Bold',
            underline=True
        ))
        self.styles.add(ParagraphStyle(
            name='SectionNote',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            spaceAfter=8,
            textColor=colors.black,
            fontName='Helvetica-Oblique'
        ))
        self.styles.add(ParagraphStyle(
            name='QuestionText',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            spaceBefore=6,
            spaceAfter=3,
            leftIndent=30
        ))
        self.styles.add(ParagraphStyle(
            name='OptionCell',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT,
            leftIndent=0
        ))
        self.styles.add(ParagraphStyle(
            name='InstructionHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            spaceAfter=4
        ))
        self.styles.add(ParagraphStyle(
            name='InstructionText',
            parent=self.styles['Normal'],
            fontSize=10,
            leftIndent=20,
            bulletIndent=10
        ))
        self.styles.add(ParagraphStyle(
            name='RightAlign',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT
        ))
        self.styles.add(ParagraphStyle(
            name='LeftAlign',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT
        ))
    
    def create_question_paper(self):
        """
        Generate the Question Paper PDF matching university format.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1*cm,
            bottomMargin=1*cm
        )
        
        elements = []
        
        # ===== HEADER SECTION =====
        # Create header table with logo on left and year on right
        header_data = []
        
        # Try to add logo if exists
        logo_cell = ''
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                logo_cell = Image(self.logo_path, width=1.5*inch, height=0.6*inch)
            except:
                logo_cell = Paragraph(f"<b>{self.university_name}</b>", self.styles['LeftAlign'])
        else:
            logo_cell = Paragraph(f"<b>{self.university_name}</b>", self.styles['LeftAlign'])
        
        year_cell = Paragraph(f"<b>{self.academic_year}</b>", self.styles['RightAlign'])
        
        header_table = Table([[logo_cell, year_cell]], colWidths=[300, 180])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 8))
        
        # Exam Title
        elements.append(Paragraph(f"<b>{self.title}</b>", self.styles['ExamTitle']))
        
        # Semester
        if self.semester:
            elements.append(Paragraph(f"Semester: {self.semester}", self.styles['SemesterText']))
        elements.append(Spacer(1, 8))
        
        # ===== INFO TABLE (Left and Right columns) =====
        info_left = []
        info_left.append(Paragraph("<b>Roll No.:</b> _________________", self.styles['LeftAlign']))
        if self.programme_name:
            info_left.append(Paragraph(f"<b>Programme:</b> {self.programme_name}", self.styles['LeftAlign']))
        info_left.append(Paragraph(f"<b>Course Title:</b> {self.course_title}", self.styles['LeftAlign']))
        if self.course_code:
            info_left.append(Paragraph(f"<b>Course Code:</b> {self.course_code}", self.styles['LeftAlign']))
        
        info_right = []
        info_right.append(Paragraph(f"<b>[Total No. of Pages: {self.total_pages}]</b>", self.styles['RightAlign']))
        info_right.append(Paragraph(f"<b>Time:</b> {self.duration} minutes", self.styles['RightAlign']))
        info_right.append(Paragraph(f"<b>Max. Marks:</b> {self.total_marks}", self.styles['RightAlign']))
        
        # Pad lists to same length
        max_len = max(len(info_left), len(info_right))
        while len(info_left) < max_len:
            info_left.append(Paragraph("", self.styles['LeftAlign']))
        while len(info_right) < max_len:
            info_right.append(Paragraph("", self.styles['RightAlign']))
        
        info_data = [[info_left[i], info_right[i]] for i in range(max_len)]
        info_table = Table(info_data, colWidths=[280, 200])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 12))
        
        # ===== GENERAL INSTRUCTIONS =====
        elements.append(Paragraph("<b>General Instructions:</b>", self.styles['InstructionHeader']))
        for i, instruction in enumerate(self.instructions, 1):
            elements.append(Paragraph(f"• {instruction}", self.styles['InstructionText']))
        elements.append(Spacer(1, 16))
        
        # ===== QUESTIONS BY SECTION =====
        questions_by_type = defaultdict(list)
        for q in self.questions:
            questions_by_type[q.get('questionType', '2 Mark')].append(q)
        
        section_order = ['MCQ', '2 Mark', '3 Mark', '5 Mark', '10 Mark']
        section_config = {
            'MCQ': {
                'name': 'Section-A',
                'note': '(All Questions are Compulsory. Each question carries 01 mark)'
            },
            '2 Mark': {
                'name': 'Section-B',
                'note': '(Short Answer Questions. Each question carries 02 marks)'
            },
            '3 Mark': {
                'name': 'Section-B', 
                'note': '(Attempt any 5 questions, each question carries 03 marks)'
            },
            '5 Mark': {
                'name': 'Section-C',
                'note': '(Attempt any 2 questions, each question carries 5 marks, subparts (if any) carry equal weightage)'
            },
            '10 Mark': {
                'name': 'Section-D',
                'note': '(Attempt any one question, each question carries 10 marks, subparts (if any) carry equal weightage)'
            }
        }
        
        question_num = 1
        for qtype in section_order:
            if qtype in questions_by_type and len(questions_by_type[qtype]) > 0:
                config = section_config.get(qtype, {'name': 'Section', 'note': ''})
                
                # Section header
                elements.append(Paragraph(f"<b><u>{config['name']}</u></b>", self.styles['SectionHeader']))
                elements.append(Paragraph(f"<i>{config['note']}</i>", self.styles['SectionNote']))
                
                for q in questions_by_type[qtype]:
                    text = q.get('text', '')
                    
                    # Question with number
                    elements.append(Paragraph(
                        f"<b>{question_num}.</b> {text}",
                        self.styles['QuestionText']
                    ))
                    
                    # Add question image if present
                    q_image = q.get('image', '')
                    if q_image:
                        img_element = self._download_image(q_image, max_width=4*inch, max_height=2.5*inch)
                        if img_element:
                            elements.append(Spacer(1, 4))
                            elements.append(img_element)
                            elements.append(Spacer(1, 4))
                    
                    # Add options for MCQ in 2x2 grid
                    if qtype == 'MCQ' and q.get('options'):
                        options = q.get('options', [])
                        option_images = q.get('optionImages', [])
                        # Pad options to at least 4 if needed
                        while len(options) < 4:
                            options.append("")
                        while len(option_images) < len(options):
                            option_images.append("")
                            
                        # Format options with roman numerals
                        labels = ['(i)', '(ii)', '(iii)', '(iv)']
                        formatted_options = []
                        for i in range(min(len(options), 4)):
                            opt_content = []
                            opt_text = Paragraph(f"<b>{labels[i]}</b> {options[i]}", self.styles['OptionCell'])
                            opt_content.append(opt_text)
                            
                            # Add option image if present
                            if i < len(option_images) and option_images[i]:
                                opt_img = self._download_image(option_images[i], max_width=1.8*inch, max_height=1.2*inch)
                                if opt_img:
                                    opt_content.append(Spacer(1, 2))
                                    opt_content.append(opt_img)
                            
                            # Wrap in a mini table if there's an image, otherwise just the paragraph
                            if len(opt_content) > 1:
                                mini_table = Table([[item] for item in opt_content], colWidths=[220])
                                mini_table.setStyle(TableStyle([
                                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                                ]))
                                formatted_options.append(mini_table)
                            else:
                                formatted_options.append(opt_text)
                        
                        # Create 2x2 grid data
                        if len(formatted_options) >= 4:
                            opt_data = [
                                [formatted_options[0], formatted_options[1]],
                                [formatted_options[2], formatted_options[3]]
                            ]
                            opt_table = Table(opt_data, colWidths=[220, 220])
                            opt_table.setStyle(TableStyle([
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('LEFTPADDING', (0, 0), (-1, -1), 30),
                                ('TOPPADDING', (0, 0), (-1, -1), 2),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                            ]))
                            elements.append(opt_table)
                        else:
                            # Fallback if fewer options
                            for idx, opt in enumerate(options):
                                if idx < 4:
                                    elements.append(Paragraph(
                                        f"{labels[idx]} {opt}",
                                        self.styles['OptionCell']
                                    ))
                    
                    question_num += 1
                elements.append(Spacer(1, 10))
        
        doc.build(elements)
        self._cleanup_temp_files()
        buffer.seek(0)
        return buffer
    
    def create_summary_report(self):
        """
        Generate the Summary Report PDF with enhanced analytics (Difficulty 1-5, Bloom's, CLO, Topics).
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1*cm,
            leftMargin=1*cm,
            topMargin=1.5*cm,
            bottomMargin=1*cm
        )
        
        elements = []
        
        # Header
        elements.append(Paragraph("QUESTION PAPER SUMMARY REPORT", self.styles['UniversityHeader']))
        elements.append(Paragraph(f"Paper: {self.title}", self.styles['ExamTitle']))
        elements.append(Spacer(1, 20))
        
        # Overview
        elements.append(Paragraph("<b>Overview</b>", self.styles['SectionHeader']))
        
        # Calculate totals
        total_time = sum([q.get('estimatedTime', 0) for q in self.questions])
        
        overview_data = [
            ['University/Institution', self.university_name],
            ['Academic Year', self.academic_year],
            ['Programme', self.programme_name or 'N/A'],
            ['Course Title', self.course_title],
            ['Course Code', self.course_code or 'N/A'],
            ['Total Questions', str(len(self.questions))],
            ['Total Marks', str(self.total_marks)],
            ['Est. Time (Teacher)', f'{total_time} minutes']
        ]
        overview_table = Table(overview_data, colWidths=[150, 300])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(overview_table)
        elements.append(Spacer(1, 20))
        
        # Difficulty Distribution (1-5)
        elements.append(Paragraph("<b>Difficulty Distribution (Scale 1-5)</b>", self.styles['SectionHeader']))
        
        difficulty_counts = defaultdict(int)
        difficulty_marks = defaultdict(int)
        for q in self.questions:
            # Handle both formats
            diff = q.get('difficultyLevel')
            if not diff:
                # Map old string difficulty to 1-5
                d_str = q.get('difficulty', 'Medium')
                diff = {'Easy': 2, 'Medium': 3, 'Hard': 4, 'Very Easy': 1, 'Very Hard': 5}.get(d_str, 3)
            
            difficulty_counts[diff] += 1
            difficulty_marks[diff] += q.get('marks', 0)
        
        diff_data = [['Level', 'Description', 'Questions', 'Marks', '%']]
        labels = {1: 'Very Easy', 2: 'Easy', 3: 'Moderate', 4: 'Hard', 5: 'Very Hard'}
        
        for level in range(1, 6):
            count = difficulty_counts.get(level, 0)
            marks = difficulty_marks.get(level, 0)
            pct = round(marks / self.total_marks * 100, 1) if self.total_marks > 0 else 0
            diff_data.append([str(level), labels.get(level, ''), str(count), str(marks), f'{pct}%'])
        
        diff_table = Table(diff_data, colWidths=[50, 100, 80, 80, 80])
        diff_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2b6cb0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(diff_table)
        elements.append(Spacer(1, 20))
        
        # Bloom's Taxonomy & CLO
        elements.append(Paragraph("<b>Bloom's Taxonomy & outcomes</b>", self.styles['SectionHeader']))
        
        bloom_counts = defaultdict(int)
        clo_counts = defaultdict(int)
        
        for q in self.questions:
            bloom_counts[q.get('bloomsTaxonomy', 'U')] += 1
            clo_counts[q.get('cloMapping', 1)] += 1
            
        # Two tables side by side
        bloom_data = [['Bloom Level', 'Count']]
        bloom_labels = {'R': 'Remember', 'U': 'Understand', 'P': 'Apply', 'E': 'Evaluate', 'N': 'Analyze', 'C': 'Create'}
        for k, v in bloom_counts.items():
            bloom_data.append([f"{k} - {bloom_labels.get(k, '')}", str(v)])
            
        clo_data = [['CLO Level', 'Count']]
        for k, v in clo_counts.items():
            clo_data.append([f"CLO-{k}", str(v)])
            
        bloom_table = Table(bloom_data, colWidths=[150, 60])
        clo_table = Table(clo_data, colWidths=[100, 60])
        
        style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#805ad5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ])
        bloom_table.setStyle(style)
        clo_table.setStyle(style)
        
        # container table
        container = Table([[bloom_table, Spacer(20, 0), clo_table]])
        elements.append(container)
        elements.append(Spacer(1, 20))
        
        # Topic Coverage
        elements.append(Paragraph("<b>Topic/Unit Coverage</b>", self.styles['SectionHeader']))
        
        topic_counts = defaultdict(int)
        for q in self.questions:
            t = q.get('topic') or q.get('unit') or 'Uncategorized'
            topic_counts[t] += 1
        
        unit_data = [['Topic/Unit', 'Questions']]
        for unit, count in sorted(topic_counts.items()):
            unit_data.append([unit, str(count)])
        
        unit_table = Table(unit_data, colWidths=[300, 100])
        unit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#38a169')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(unit_table)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
