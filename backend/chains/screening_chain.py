import os

from dotenv import load_dotenv
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_groq import ChatGroq

from prompts.templates import extraction_prompt, scoring_prompt

load_dotenv()


llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY"),
)


def build_screening_pipeline():
    """Build the two-step LCEL pipeline for resume screening."""
    extraction_chain = extraction_prompt | llm | StrOutputParser()

    scoring_chain = (
        {"analysis": extraction_chain}
        | scoring_prompt
        | llm
        | JsonOutputParser()
    )

    return scoring_chain


def build_screening_chain():
    """Backward-compatible alias for the screening pipeline."""
    return build_screening_pipeline()
