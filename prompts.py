# prompts.py
prompts = {
    "true_false": '''Based on the following content, create a True/False question and provide the correct answer in the given format:
    {{
        "id": {id},
        "question_text": "Provide the true/false statement here",
        "test_type": "True/False",
        "points": 1.0,
        "options": {{
            "choices": ["True", "False"],
            "correct_answer": "True or False"
        }}
    }}

    Content: {content}
    ''',
    
    "multiple_choice": '''Create a multiple-choice question based on this content. Provide four options, with one correct answer in the given format:
    {{
        "id": {id},
        "question_text": "Provide the question text here",
        "test_type": "multiple_choice",
        "points": 1.0,
        "options": {{
            "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correct_answer": "Correct option"
        }}
    }}
    Content: {content}''',
    "written_response": '''Create a written response question based on this content. Ask a question that require deep understanding of the subject and thorough knowledge to answer the question correctly,in the given format:
    {{
        "id": {id},
        "question_text": "Provide the question text here",
        "test_type": "written_response",
        "points": 3.0,
        "options": {{
            "choices": ["NA"]
        }},
        "salient_points" : "Provide the salient points to answer the question, which could be later used to check if the question is correctly and completely answered."
    }}
    Content: {content}''',
    # You can add more templates here
}
