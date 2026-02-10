import random
from collections import defaultdict

class QuestionSelector:
    """
    Intelligent question selection engine with constraints:
    - Difficulty distribution
    - Question type coverage
    - Unit-based percentage allocation
    - No repetition
    - Marks target
    """
    
    def __init__(self, questions, config):
        self.questions = questions
        self.config = config
        self.total_marks = config.get('totalMarks', 100)
        self.difficulty_dist = config.get('difficultyDistribution', {
            '1': 20, '2': 30, '3': 30, '4': 15, '5': 5
        })
        self.question_types = config.get('questionTypes', ['MCQ', '3 Mark', '5 Mark'])
        self.unit_config = config.get('unitConfig', [])  # List of {name, topics, percentage}
        self.question_counts = config.get('questionCounts', {})  # Dict of {type: count}
    
    def select(self):
        """
        Main selection algorithm. If questionCounts is provided, select exact counts.
        Otherwise use unit-based or difficulty-based selection.
        Returns tuple: (selected_questions, analytics)
        """
        selected = []
        current_marks = 0
        used_ids = set()
        
        # Check if question counts are specified (any count > 0)
        has_counts = any(count > 0 for count in self.question_counts.values())
        
        if has_counts:
            # Select exact number of questions per type
            for q_type, count in self.question_counts.items():
                if count <= 0:
                    continue
                    
                # Filter questions by type
                type_questions = [q for q in self.questions if q.get('questionType') == q_type]
                
                # Shuffle for randomness
                random.shuffle(type_questions)
                
                # Select up to the requested count
                selected_count = 0
                for question in type_questions:
                    q_id = str(question.get('_id', ''))
                    if q_id in used_ids:
                        continue
                        
                    selected.append(question)
                    used_ids.add(q_id)
                    current_marks += question.get('marks', 0)
                    selected_count += 1
                    
                    if selected_count >= count:
                        break
            
            # Generate analytics and return early
            analytics = self._compute_analytics(selected)
            return selected, analytics
        
        # Original selection logic (when no counts specified)
        # Filter questions by allowed types
        type_filtered = [q for q in self.questions if q.get('questionType') in self.question_types]
        
        # If unit configuration is provided, use unit-based selection
        if self.unit_config and len(self.unit_config) > 0:
            for unit in self.unit_config:
                unit_name = unit.get('name', 'Unnamed')
                unit_topics = unit.get('topics', [])
                unit_percentage = unit.get('percentage', 0)
                unit_target_marks = int(self.total_marks * unit_percentage / 100)
                
                # Filter questions for this unit's topics
                if unit_topics and len(unit_topics) > 0:
                    unit_questions = [q for q in type_filtered if q.get('topic') in unit_topics]
                else:
                    unit_questions = type_filtered  # Use all if no topics specified
                
                # Remove already used questions
                unit_questions = [q for q in unit_questions if str(q.get('_id', '')) not in used_ids]
                
                # Shuffle for randomness
                random.shuffle(unit_questions)
                
                # Select questions for this unit
                unit_marks = 0
                for question in unit_questions:
                    q_id = str(question.get('_id', ''))
                    q_marks = question.get('marks', 0)
                    
                    if unit_marks + q_marks <= unit_target_marks + 5:  # Allow 5 marks flexibility
                        selected.append(question)
                        used_ids.add(q_id)
                        unit_marks += q_marks
                        current_marks += q_marks
                    
                    if unit_marks >= unit_target_marks:
                        break
        else:
            # Fallback to original difficulty-based selection
            by_difficulty = defaultdict(list)
            for q in type_filtered:
                diff = str(q.get('difficulty', 3))  # Convert to string for consistency
                by_difficulty[diff].append(q)
            
            for diff in by_difficulty:
                random.shuffle(by_difficulty[diff])
            
            # Calculate target marks per difficulty
            for diff, percentage in self.difficulty_dist.items():
                target_marks = int(self.total_marks * percentage / 100)
                achieved_marks = 0
                available = by_difficulty.get(str(diff), [])
                
                for question in available:
                    q_id = str(question.get('_id', ''))
                    q_marks = question.get('marks', 0)
                    
                    if q_id in used_ids:
                        continue
                    
                    if achieved_marks + q_marks <= target_marks + 5:
                        selected.append(question)
                        used_ids.add(q_id)
                        achieved_marks += q_marks
                        current_marks += q_marks
                    
                    if achieved_marks >= target_marks:
                        break
        
        # Fill remaining marks if needed
        remaining_marks = self.total_marks - current_marks
        if remaining_marks > 0:
            all_remaining = [q for q in type_filtered if str(q.get('_id', '')) not in used_ids]
            random.shuffle(all_remaining)
            
            for question in all_remaining:
                q_marks = question.get('marks', 0)
                if q_marks <= remaining_marks:
                    selected.append(question)
                    current_marks += q_marks
                    remaining_marks -= q_marks
                
                if remaining_marks <= 0:
                    break
        
        # Generate analytics
        analytics = self._compute_analytics(selected)
        
        return selected, analytics
    
    def _compute_analytics(self, selected):
        """
        Compute summary analytics for the selected questions.
        """
        total_questions = len(selected)
        total_marks = sum(q.get('marks', 0) for q in selected)
        
        # Difficulty distribution
        difficulty_counts = defaultdict(int)
        difficulty_marks = defaultdict(int)
        for q in selected:
            diff = q.get('difficulty', 'Medium')
            difficulty_counts[diff] += 1
            difficulty_marks[diff] += q.get('marks', 0)
        
        # Question type distribution
        type_counts = defaultdict(int)
        type_marks = defaultdict(int)
        for q in selected:
            qtype = q.get('questionType', 'Short')
            type_counts[qtype] += 1
            type_marks[qtype] += q.get('marks', 0)
        
        # Unit coverage
        unit_counts = defaultdict(int)
        for q in selected:
            unit = q.get('unit', 'Unknown')
            unit_counts[unit] += 1
        
        return {
            'totalQuestions': total_questions,
            'totalMarks': total_marks,
            'difficultyDistribution': {
                'counts': dict(difficulty_counts),
                'marks': dict(difficulty_marks),
                'percentages': {
                    k: round(v / total_marks * 100, 1) if total_marks > 0 else 0
                    for k, v in difficulty_marks.items()
                }
            },
            'typeDistribution': {
                'counts': dict(type_counts),
                'marks': dict(type_marks)
            },
            'unitCoverage': dict(unit_counts)
        }
