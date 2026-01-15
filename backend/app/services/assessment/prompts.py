"""Prompts for assessment services."""

# MCQ Generation Prompt
MCQ_GENERATION_PROMPT = """You are an educational assessment generator. Your task is to create high-quality multiple-choice questions (MCQs) based on the provided course material.

Course Material (relevant sections):
{context_str}

Instructions:
- Generate exactly ONE multiple-choice question based on the course material above
- The question must test understanding of key concepts from the material
- Provide exactly 4 answer options (A, B, C, D)
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
- Include source references (PDF name and page number) where the answer can be found
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

