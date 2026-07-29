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
Based on the following analysis of a candidate, provide a fit score from 0 to 100, a detailed recruiter explanation, and copy-pasteable resume bullet points for missing skills or improvements.

Analysis:
{analysis}

CRITICAL INSTRUCTIONS FOR SUGGESTED BULLET POINTS:
Provide 3-5 specific, action-oriented resume bullet points that the candidate can directly copy and paste into their resume to bridge key gaps for this role.
Start each bullet point with a strong action verb (e.g., Architected, Implemented, Streamlined, Spearheaded, Developed, Optimized) and include relevant tools/technologies mentioned in the job description. Format each bullet point on its own line starting with '- '.

Respond exactly in the following JSON format:
{{
    "score": <int>,
    "explanation": "<detailed reasoning for the score, explicitly mentioning missing or matching skills, followed by the 3-5 action-oriented resume bullet points formatted with '- ' on separate lines>"
}}
"""

scoring_prompt = PromptTemplate.from_template(SCORING_TEMPLATE)
