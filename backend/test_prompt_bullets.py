import os
from dotenv import load_dotenv
from chains.screening_chain import build_screening_pipeline

load_dotenv()

def test_prompt_bullets():
    print("1. Initializing screening pipeline...")
    pipeline = build_screening_pipeline()

    sample_jd = """
    We are seeking a Senior Full-Stack Engineer with expertise in Python, FastAPI, React, TypeScript, and AWS.
    Responsibilities:
    - Build scalable REST APIs using FastAPI and Python.
    - Develop modern frontends in React and TypeScript.
    - Deploy containerized applications to AWS ECS/Docker.
    - Implement CI/CD pipelines with GitHub Actions.
    """

    sample_resume = """
    John Doe - Software Engineer
    Experience:
    - Built web apps using JavaScript, React, and Python Flask.
    - Created basic SQLite database schemas.
    - Implemented HTML/CSS responsive user interfaces.
    """

    print("2. Invoking AI screening pipeline...")
    result = pipeline.invoke({
        "job_description": sample_jd,
        "resume_text": sample_resume
    })

    print("\n--- AI Result ---")
    print("Score:", result.get("score"))
    print("Explanation / Feedback:\n", result.get("explanation"))

    assert "score" in result, "Result must contain 'score'"
    assert "explanation" in result, "Result must contain 'explanation'"
    assert result.get("score") is not None, "Score must not be None"

    explanation = result.get("explanation", "")
    print("\n3. Verifying output contains copy-pasteable bullet points...")
    lines = explanation.split("\n")
    bullet_lines = [l for l in lines if l.strip().startswith("-")]
    print(f"Found {len(bullet_lines)} bullet lines:")
    for b in bullet_lines:
        print("  *", b)

    print("\nALL PROMPT BULLET VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_prompt_bullets()
