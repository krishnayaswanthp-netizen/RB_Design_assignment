from chains.screening_chain import build_screening_pipeline


def read_file(filepath):
    with open(filepath, "r", encoding="utf-8") as file:
        return file.read()


def main():
    jd_text = (
        "Looking for a Data Scientist with 3+ years experience. Must know "
        "Python, SQL, Machine Learning (Random Forest, XGBoost), and Git. "
        "LangChain experience is a plus."
    )

    resumes = {
        "Strong": (
            "Data Scientist with 4 years of experience. Expert in Python, SQL, "
            "and Git. Built models using Random Forest and XGBoost. Deployed "
            "applications using LangChain and Docker."
        ),
        "Average": (
            "Data Analyst with 2 years of experience. Proficient in Python, SQL, "
            "and Tableau. Familiar with basic Machine Learning concepts like "
            "linear regression."
        ),
        "Weak": (
            "Recent graduate with a degree in biology. Worked as a barista. "
            "Fast learner, good communication skills, highly motivated."
        ),
    }

    pipeline = build_screening_pipeline()

    for candidate_type, resume_content in resumes.items():
        print(f"\nEvaluating {candidate_type} Candidate...")
        try:
            result = pipeline.invoke(
                {
                    "job_description": jd_text,
                    "resume_text": resume_content,
                }
            )
            print(f"Score: {result.get('score')}/100")
            print(f"Explanation: {result.get('explanation')}")
        except Exception as e:
            print(f"Error evaluating candidate: {e}")


if __name__ == "__main__":
    main()
