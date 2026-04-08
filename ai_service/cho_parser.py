"""
CHO (Course Handout) Parser — v2
Extracts structured syllabus mapping (Topic → Unit, Lecture No, CLO) from
Chitkara-format Course Handout documents (PDF and DOCX).

The parser focuses on the "Delivery/Instructional Resources → Theory Plan"
section which contains topic-level CLO assignments.
"""

import re
import json


def extract_text_from_docx(file_path):
    """Extract raw text from a Word document."""
    import mammoth
    with open(file_path, 'rb') as f:
        result = mammoth.extract_raw_text(f)
    return result.value


def extract_text_from_pdf(file_path):
    """Extract raw text from a PDF document."""
    from PyPDF2 import PdfReader
    reader = PdfReader(file_path)
    text = ''
    for page in reader.pages:
        text += page.extract_text() + '\n'
    return text


def parse_clo_definitions(text):
    """
    Extract CLO definitions from the CHO text.
    Returns: dict like { 'CLO01': 'Demonstrate basic concepts...', ... }
    """
    clos = {}
    
    # Narrow search to the CLO definition area
    clo_section_start = re.search(
        r'Course\s+Learning\s+Outcomes|Student\s+should\s+be\s+able',
        text, re.IGNORECASE
    )
    clo_section_end = re.search(
        r'Total\s+Contact\s+Hours|CLO-PO\s+Mapping',
        text, re.IGNORECASE
    )
    
    if clo_section_start and clo_section_end:
        section = text[clo_section_start.start():clo_section_end.start()]
    else:
        # Fallback: search entire text but only for CLO definitions
        section = text[:5000]  # CLO defs are always near the top
    
    # Pattern: CLO01 followed by description then PO references
    clo_pattern = re.compile(
        r'CLO\s*0?(\d+)\s+(.+?)(?=CLO\s*0?\d+\s|Total\s+Contact|$)',
        re.DOTALL | re.IGNORECASE
    )
    
    for match in clo_pattern.finditer(section):
        clo_num = int(match.group(1))
        clo_id = f"CLO{clo_num:02d}"
        desc = match.group(2).strip()
        # Clean: take description before PO references
        desc_clean = re.split(r'\bPO\d', desc)[0].strip()
        desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
        if desc_clean and len(desc_clean) > 5:
            clos[clo_id] = desc_clean
    
    return clos


def extract_theory_plan_section(text):
    """
    Extract the Delivery/Instructional Resources → Theory Plan section.
    This is the most reliable source for topic-CLO mapping.
    """
    # Strategy 1: Look for the exact section header "Delivery/Instructional Resources"
    delivery_match = re.search(
        r'Delivery\s*/?\s*Instructional\s+Resources',
        text, re.IGNORECASE
    )
    
    if not delivery_match:
        # Strategy 2: Look for "Delivery" that is near "Theory Plan"
        delivery_match = re.search(
            r'Delivery.{0,100}Theory\s+Plan',
            text, re.IGNORECASE | re.DOTALL
        )
    
    if delivery_match:
        start = delivery_match.start()
    else:
        return None
    
    # End at "Lab Plan" within this section (find the first one after our start)
    remaining = text[start:]
    lab_match = re.search(r'Lab\s+Plan', remaining, re.IGNORECASE)
    
    if lab_match:
        return remaining[:lab_match.start()]
    
    # Fallback: take a large chunk
    return remaining[:15000]


def parse_delivery_theory_plan(theory_text):
    """
    Parse the Delivery Theory Plan into structured topic-CLO mappings.
    Handles both DOCX format (clean newlines) and PDF format (inline text).
    """
    if not theory_text:
        return []
    
    # Strategy 1: DOCX-style — lecture range is on its own line: \nRANGE\n
    mappings = _parse_docx_style(theory_text)
    
    # Strategy 2: PDF-style — lecture range is inline: \nRANGE TopicText... CLO#
    if len(mappings) == 0:
        mappings = _parse_pdf_style(theory_text)
    
    return mappings


def _parse_docx_style(theory_text):
    """Parse DOCX-style where lecture ranges are on separate lines."""
    mappings = []
    
    # More robust split: lecture numbers may be surrounded by varying whitespace/newlines
    # Pattern: newline(s), then a lecture range like "1-3" or "17", then newline(s)
    entries = re.split(r'\n\s*(\d+(?:\s*-\s*\d+)?)\s*\n', theory_text)
    
    # Also try to catch the very first entry if the text starts with a number
    first_match = re.match(r'^\s*(\d+(?:\s*-\s*\d+)?)\s*\n', theory_text)
    if first_match and len(entries) > 0 and entries[0].strip() == '':
        # The split already caught it
        pass
    
    i = 1
    while i < len(entries) - 1:
        lecture_range = entries[i].strip()
        content = entries[i + 1]
        i += 2
        
        lines = [l.strip() for l in content.split('\n') if l.strip()]
        if not lines:
            continue
        
        # Skip header rows
        skip_words = ['lect', 'no.', 'topics', 'clo', 'book', 'tlm', 'alm', 
                       'web ref', 'audio', 'page', 'theory plan']
        if any(lines[0].lower().startswith(sw) for sw in skip_words):
            continue
        if len(lines[0]) < 3:
            continue
        
        # Collect topic text: join all lines before CLO/book/URL references
        # This handles multi-line topic descriptions
        topic_lines = []
        desc_lines = []
        found_clo = False
        for line in lines:
            # Stop collecting topic text at CLO, book refs, URLs, or teaching methods
            if re.match(r'^(CLO\s*\d|B0\d|R0\d|http|www|Lecture$|Questioning|Discussion|Quiz|Group|Debate|Case|Peer|Brain|Test\s|Demon)', line, re.IGNORECASE):
                found_clo = True
                continue
            if found_clo:
                continue
            topic_lines.append(line)
        
        # Build topic name from collected lines
        topic_name = ' '.join(topic_lines).strip()
        topic_name = re.sub(r'\s+', ' ', topic_name)
        
        # Remove trailing colons or punctuation
        topic_name = topic_name.rstrip(':').strip()
        
        if len(topic_name) < 5:
            continue
        
        # Extract CLO references from entire content block
        clo_matches = re.findall(r'CLO\s*0?(\d+)', content, re.IGNORECASE)
        clo_ids = list(dict.fromkeys([f"CLO{int(n):02d}" for n in clo_matches]))
        
        primary_clo = clo_ids[0] if clo_ids else 'CLO01'
        clo_num = int(re.search(r'(\d+)', primary_clo).group(1))
        
        mappings.append({
            'topic': topic_name,
            'lectures': lecture_range,
            'description': '',
            'cloIds': clo_ids,
            'primaryClo': primary_clo,
            'cloNum': clo_num
        })
    
    return mappings


def _parse_pdf_style(theory_text):
    """
    Parse PDF-style where lecture ranges are inline with topic text.
    Format: \n1-3 Cloud Computing Overview:\nCloud Computing History...\nCLO1 B01...\n
    """
    mappings = []
    
    # Match pattern: RANGE SPACE TopicText...CLO##
    # We split the section by lecture range at start of line
    # In PDFs, entries look like: \n1-3 Topic Title:\nDescription\n...CLO1...\n4-6 Next Topic
    pattern = re.compile(
        r'(?:^|\n)\s*(\d+(?:\s*-\s*\d+)?)\s+(.+?)(?=\n\s*\d+(?:\s*-\s*\d+)?\s+[A-Z]|\nST\d|\nEnd\s*Term|\Z)',
        re.DOTALL
    )
    
    for match in pattern.finditer(theory_text):
        lecture_range = match.group(1).strip()
        content = match.group(2).strip()
        
        # Extract topic name: text before the first CLO reference
        # or before the first colon-terminated line
        topic_part = re.split(r'\bCLO\s*\d', content, maxsplit=1)[0]
        
        # Get first meaningful line as topic
        lines = [l.strip() for l in topic_part.split('\n') if l.strip()]
        if not lines:
            continue
        
        topic_name = lines[0].rstrip(':').strip()
        topic_name = re.sub(r'\s+', ' ', topic_name)
        
        # Skip junk
        skip_words = ['lect', 'lec', 'no.', 'topics', 'clo', 'book', 'tlm', 'alm',
                       'web ref', 'audio', 'page', 'course plan', 'teaching',
                       'active learn', 'remedial', 'national', 'nheqf']
        if any(topic_name.lower().startswith(sw) for sw in skip_words):
            continue
        if len(topic_name) < 5:
            continue
        
        # Extract CLO refs from entire content block
        clo_matches = re.findall(r'CLO\s*0?(\d+)', content, re.IGNORECASE)
        clo_ids = list(dict.fromkeys([f"CLO{int(n):02d}" for n in clo_matches]))
        
        primary_clo = clo_ids[0] if clo_ids else 'CLO01'
        clo_num = int(re.search(r'(\d+)', primary_clo).group(1))
        
        # Description: remaining text lines before CLO/URL/book refs
        desc_lines = []
        for line in lines[1:]:
            if re.match(r'^(CLO|B0|R0|http|www|Lec\b|Questioning|Discussion|Quiz|Group|Debat|Case|Demon)', line, re.IGNORECASE):
                break
            desc_lines.append(line)
        description = re.sub(r'\s+', ' ', ' '.join(desc_lines)).strip()
        
        mappings.append({
            'topic': topic_name,
            'lectures': lecture_range,
            'description': description,
            'cloIds': clo_ids,
            'primaryClo': primary_clo,
            'cloNum': clo_num
        })
    
    return mappings


def determine_unit(lecture_range, total_lectures=42):
    """
    Estimate the Unit/Chapter based on lecture number.
    Uses the standard Chitkara CHO structure where:
    - Lectures before ST1 (~40%) = Unit 1-2
    - Lectures between ST1 and ST2 (~60-80%) = Unit 3-4
    - Lectures after ST2 = Unit 5
    """
    try:
        if '-' in str(lecture_range):
            parts = str(lecture_range).split('-')
            start_lect = int(parts[0].strip())
        else:
            start_lect = int(lecture_range)
        
        # Divide into units
        unit_size = max(1, total_lectures / 5)
        unit_num = min(5, max(1, int((start_lect - 1) / unit_size) + 1))
        return f"Unit {unit_num}"
    except (ValueError, TypeError):
        return "Unit 1"


def parse_cho(file_path):
    """
    Main entry point: parses a CHO file and returns structured syllabus mapping.
    
    Args:
        file_path: Path to the CHO file (.docx or .pdf)
    
    Returns:
        dict with subject, clo_definitions, and mappings
    """
    # 1. Extract text
    ext = file_path.lower().rsplit('.', 1)[-1]
    if ext == 'docx':
        text = extract_text_from_docx(file_path)
    elif ext == 'pdf':
        text = extract_text_from_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file type: .{ext}. Use .docx or .pdf")
    
    # 2. Detect subject name
    subject = "Unknown Subject"
    subject_match = re.search(r'Course\s+Name\s*\n\s*(.+)', text, re.IGNORECASE)
    if subject_match:
        subject = subject_match.group(1).strip()
        subject = re.sub(r'\s+', ' ', subject)
    
    # PDF fallback: look for course code pattern like "22CA028 /Introduction to Cloud & IoT"
    if subject == "Unknown Subject":
        code_match = re.search(r'\d{2}[A-Z]{2}\d+\s*/\s*(.+?)(?:\s{2,}|\n)', text)
        if code_match:
            subject = code_match.group(1).strip()
            subject = re.sub(r'\s+', ' ', subject)
    
    # 3. Detect total contact hours
    total_match = re.search(r'Total\s+Contact\s+Hours\s*[:\s]*(\d+)', text, re.IGNORECASE)
    total_lectures = int(total_match.group(1)) if total_match else 42
    
    # 4. Parse CLO definitions
    clo_defs = parse_clo_definitions(text)
    
    # 5. Extract the Delivery Theory Plan section
    theory_section = extract_theory_plan_section(text)
    
    # 6. Parse topic-CLO mappings from the theory section
    raw_mappings = parse_delivery_theory_plan(theory_section)
    
    # 7. Build final mappings with unit estimation
    final_mappings = []
    for m in raw_mappings:
        unit = determine_unit(m['lectures'], total_lectures)
        final_mappings.append({
            'topic': m['topic'],
            'unit': unit,
            'lectureNumber': m['lectures'],
            'cloMapping': m['cloNum'],
            'cloId': m['primaryClo'],
            'allCLOs': m['cloIds'],
            'description': m['description']
        })
    
    # Sort by lecture number
    def sort_key(m):
        try:
            return int(m['lectureNumber'].split('-')[0])
        except (ValueError, IndexError):
            return 999
    
    final_mappings.sort(key=sort_key)
    
    return {
        'subject': subject,
        'clo_definitions': clo_defs,
        'mappings': final_mappings,
        'totalTopics': len(final_mappings),
        'totalLectures': total_lectures
    }


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        result = parse_cho(sys.argv[1])
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python cho_parser.py <path_to_cho_file>")
