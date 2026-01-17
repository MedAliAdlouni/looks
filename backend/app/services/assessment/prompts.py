"""Prompts for assessment services."""

# MCQ Generation Prompt
MCQ_GENERATION_PROMPT = """You are an educational assessment generator. Your task is to create high-quality multiple-choice questions (MCQs) based on the provided course material.

Course Material (relevant sections):
{context_str}

Instructions:
- Generate exactly ONE multiple-choice question based on the course material above
- The question must test understanding of key concepts from the material
{difficulty_instruction}- Provide exactly 4 answer options (A, B, C, D)
- Each question may have 0, 1, or multiple correct answers (indicate which options are correct)
- For EACH answer option, provide a justification explaining why it is correct or incorrect
- Include a helpful hint that guides the student toward the correct answer without giving it away
- Cite the source references (PDF name and page number) where the answer can be found
- Ensure the question is clear, unambiguous, and pedagogically sound
- Base the question ONLY on the provided course material - do not use external knowledge

Output Format (JSON):
{{
    "question": "The question text here",
    "options": [
        {{
            "id": "A",
            "text": "Option A text",
            "is_correct": true,
            "justification": "Explanation of why this is correct or incorrect"
        }},
        {{
            "id": "B",
            "text": "Option B text",
            "is_correct": false,
            "justification": "Explanation of why this is correct or incorrect"
        }},
        {{
            "id": "C",
            "text": "Option C text",
            "is_correct": true,
            "justification": "Explanation of why this is correct or incorrect"
        }},
        {{
            "id": "D",
            "text": "Option D text",
            "is_correct": false,
            "justification": "Explanation of why this is correct or incorrect"
        }}
    ],
    "hint": "A helpful hint that guides the student without revealing the answer",
    "source_references": [
        {{
            "document_name": "Name of the PDF/document",
            "page": 5
        }}
    ]
}}

Generate the MCQ now:"""


# Open-Ended Question Generation Prompt
OPEN_ENDED_QUESTION_GENERATION_PROMPT = """You are an educational assessment generator. Your task is to create an open-ended question based on the provided course material.

Course Material (relevant sections):
{context_str}

Instructions:
- Generate exactly ONE open-ended question based on the course material above
- The question should require a thoughtful, detailed answer (not just yes/no or one word)
- The question should test comprehension, analysis, or application of concepts from the material
{difficulty_instruction}- Include source references (PDF name and page number) where the answer can be found
- Base the question ONLY on the provided course material - do not use external knowledge

Output Format (JSON):
{{
    "question": "The open-ended question text here",
    "source_references": [
        {{
            "document_name": "Name of the PDF/document",
            "page": 5
        }}
    ]
}}

Generate the open-ended question now:"""


# Open-Ended Answer Evaluation Prompt
OPEN_ENDED_EVALUATION_PROMPT = """You are an educational assessment evaluator. Your task is to evaluate a student's answer to an open-ended question by comparing it to the course material.

Course Material (relevant sections):
{context_str}

Question: {question}

Student's Answer: {student_answer}

Instructions:
- Provide a reference (ideal) answer based on the course material
- Evaluate how close the student's answer is to the correct one
- Explain what is correct, what is missing, and what is incorrect in the student's answer
- Be constructive and educational in your feedback
- Cite source references (PDF name and page number) so the student can review the material
- Base your evaluation ONLY on the provided course material - do not use external knowledge

Output Format (JSON):
{{
    "reference_answer": "The ideal answer based on the course material",
    "evaluation": {{
        "score_explanation": "Overall assessment of how well the student answered",
        "correct_aspects": ["List of what the student got right"],
        "missing_aspects": ["List of important points the student missed"],
        "incorrect_aspects": ["List of any incorrect information in the student's answer"]
    }},
    "feedback": "Constructive feedback to help the student improve",
    "source_references": [
        {{
            "document_name": "Name of the PDF/document",
            "page": 5
        }}
    ]
}}

Evaluate the student's answer now:"""


# Find Mistake Generation Prompt
FIND_MISTAKE_GENERATION_PROMPT = """You are an educational assessment generator. Your task is to create a "find the mistake" assessment item based on the provided course material.

Course Material (relevant sections):
{context_str}

Instructions:
- Generate exactly ONE "find the mistake" assessment item
- Create an intentionally incorrect solution or reasoning based on common misconceptions or errors related to the course material
{difficulty_instruction}- The incorrect solution should be plausible but contain a clear mistake
- The mistake should be educational and help students learn by identifying and correcting errors
- Provide the corrected version and explanation
- Base the mistake ONLY on concepts from the provided course material - do not use external knowledge

Output Format (JSON):
{{
    "id": "unique-identifier-for-this-item",
    "prompt": "Find the mistake and explain why it's wrong. Provide the corrected version.",
    "incorrect_solution": "An intentionally wrong solution or reasoning that contains a mistake based on course concepts",
    "expected_correction": "The corrected version of the solution",
    "explanation": "Explanation of what was wrong and why the correction is correct",
    "source_references": [
        {{
            "document_name": "Name of the PDF/document",
            "page": 5
        }}
    ]
}}

Generate the find_mistake assessment item now:"""


# Case-Based Assessment Generation Prompt
CASE_BASED_GENERATION_PROMPT = """You are an educational assessment generator. Your task is to create a case-based assessment bundle based on the provided course material.

Course Material (relevant sections):
{context_str}

Instructions:
- Generate exactly ONE case-based assessment bundle
- Create a realistic scenario or case study based on the course material
{difficulty_instruction}- The case should include:
  * A case title (brief, descriptive)
  * A case description/scenario (detailed enough for students to understand the context)
  * Exactly 2 multiple-choice questions (MCQ) related to the case
  * Exactly 1 open-ended question related to the case
- All questions must relate to the case scenario and test understanding of course concepts
- Base the case and questions ONLY on the provided course material - do not use external knowledge

Output Format (JSON):
{{
    "id": "unique-identifier-for-this-case",
    "case_title": "Title of the case",
    "case_description": "Detailed description/scenario of the case study",
    "questions": [
        {{
            "kind": "mcq",
            "question": "First MCQ question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer_index": 1,
            "hint": "Helpful hint for this question",
            "source_references": [
                {{
                    "document_name": "Name of the PDF/document",
                    "page": 5
                }}
            ]
        }},
        {{
            "kind": "mcq",
            "question": "Second MCQ question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer_index": 0,
            "hint": "Helpful hint for this question",
            "source_references": [
                {{
                    "document_name": "Name of the PDF/document",
                    "page": 5
                }}
            ]
        }},
        {{
            "kind": "open_ended",
            "question": "Open-ended question text",
            "expected_answer": "Expected answer or key points",
            "rubric": ["Key point 1", "Key point 2", "Key point 3"],
            "source_references": [
                {{
                    "document_name": "Name of the PDF/document",
                    "page": 5
                }}
            ]
        }}
    ],
    "source_references": [
        {{
            "document_name": "Name of the PDF/document",
            "page": 5
        }}
    ]
}}

Generate the case-based assessment bundle now:"""
