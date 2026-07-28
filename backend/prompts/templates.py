from langchain_core.prompts import PromptTemplate


EXTRACTION_TEMPLATE = """
You are a strict, objective technical recruiter.
Analyze the following Resume against the provided Job Description.

Job Description:
{job_description}

Resume:
{resume_text}

CRITICAL RULES:
1. Do NOT assume skills that are not explicitly written in the resume.
2. Extract the candidate's exact skills, years of experience, and tools.
3. Compare them directly to the job description requirements.

Provide your analysis.
"""

extraction_prompt = PromptTemplate.from_template(EXTRACTION_TEMPLATE)


SCORING_TEMPLATE = """
Based on the following analysis of a candidate, provide a fit score from 0 to 100 and a detailed explanation.

Analysis:
{analysis}

Respond exactly in the following JSON format:
{{
    "score": <int>,
    "explanation": "<detailed reasoning for the score, explicitly mentioning missing or matching skills>"
}}
"""

scoring_prompt = PromptTemplate.from_template(SCORING_TEMPLATE)
