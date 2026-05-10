"""Main script: Build the complete report"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from part1_setup import *
from part2_chapters1to4 import *
from part3_chapters5to8 import *

def build_list_of_figures(doc):
    doc.add_page_break()
    add_lof(doc)
    figures = [
        ('5.1', 'System Architecture (Three-Tier Microservices)'),
        ('5.2', 'Database ER Diagram'),
        ('5.3', 'Entity-Relationship Diagram'),
        ('5.4', 'UML Class Diagram'),
        ('5.5', 'Use Case Diagram'),
        ('5.6', 'DFD Level 0: Context Diagram'),
        ('5.7', 'DFD Level 1: Detailed Process Flow'),
        ('5.8', 'DFD Level 2: Sub-Process Decomposition'),
        ('5.9', 'System Sequence Diagram'),
        ('5.10', 'System Flowchart'),
        ('5.11', 'Google OAuth 2.0 Sign-In Flow'),
        ('5.12', 'Question Paper Generation Workflow'),
    ]
    for num, title in figures:
        p = doc.add_paragraph()
        r = p.add_run(f'Figure {num}: {title}')
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        p.paragraph_format.space_after = Pt(4)

def build_list_of_tables(doc):
    doc.add_page_break()
    add_lot(doc)
    tables = [
        ('2.1', 'Hardware Requirements'),
        ('2.2', 'Software Requirements'),
        ('3.1', 'Team Structure'),
        ('3.2', 'Development Schedule'),
        ('3.3', 'Programming Languages and Development Tools'),
        ('4.1', 'Development Environments'),
        ('4.2', 'User Interface Summary'),
        ('4.3', 'API Endpoints'),
        ('4.4', 'Performance Specifications'),
        ('5.1', 'User Collection Schema'),
        ('5.2', 'Question Collection Schema'),
        ('5.3', 'Paper Collection Schema'),
        ('5.4', 'SyllabusMap Collection Schema'),
        ('6.1', 'Functional Test Cases'),
        ('7.1', 'Deployment Architecture'),
        ('7.2', 'Environment Variables'),
    ]
    for num, title in tables:
        p = doc.add_paragraph()
        r = p.add_run(f'Table {num}: {title}')
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        p.paragraph_format.space_after = Pt(4)

def main():
    print("Creating document...")
    doc = create_doc()
    setup_styles(doc)

    # 1. Title Page
    print("  Building title page...")
    build_title_page(doc)

    # 2. Abstract
    print("  Building abstract...")
    build_abstract(doc)

    # 3. Table of Contents
    print("  Adding Table of Contents...")
    doc.add_page_break()
    add_toc(doc)

    # 4. List of Figures
    print("  Adding List of Figures...")
    build_list_of_figures(doc)

    # 5. List of Tables
    print("  Adding List of Tables...")
    build_list_of_tables(doc)

    # 6. Chapter 1: Introduction
    print("  Building Chapter 1: Introduction...")
    build_chapter1(doc)

    # 7. Chapter 2: System Requirements
    print("  Building Chapter 2: System Requirements...")
    build_chapter2(doc)

    # 8. Chapter 3: Project Plan
    print("  Building Chapter 3: Project Plan...")
    build_chapter3(doc)

    # 9. Chapter 4: System Requirement Specifications
    print("  Building Chapter 4: System Requirement Specifications...")
    build_chapter4(doc)

    # 10. Chapter 5: Design
    print("  Building Chapter 5: Design...")
    build_chapter5(doc)

    # 11. Chapter 6: Testing
    print("  Building Chapter 6: Testing...")
    build_chapter6(doc)

    # 12. Chapter 7: Implementation
    print("  Building Chapter 7: Implementation...")
    build_chapter7(doc)

    # 13. Chapter 8: Project Legacy
    print("  Building Chapter 8: Project Legacy...")
    build_chapter8(doc)

    # 14. Bibliography
    print("  Building Bibliography...")
    build_bibliography(doc)

    # Save
    print(f"\nSaving to: {OUTPUT_FILE}")
    doc.save(OUTPUT_FILE)
    print("Report generated successfully!")

if __name__ == '__main__':
    main()
