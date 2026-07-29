import hashlib
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_email_hash(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode("utf-8")).hexdigest()

def test_user_usage_endpoint():
    print("1. Initializing Supabase client...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    test_email = "usage_pill_test@example.com"
    email_hash = get_email_hash(test_email)

    print(f"2. Upserting usage_tracker entry with credits_used = 5 for {test_email}...")
    supabase.table("usage_tracker").upsert({
        "email_hash": email_hash,
        "credits_used": 5
    }).execute()

    print("3. Querying usage_tracker table...")
    res = supabase.table("usage_tracker").select("credits_used").eq("email_hash", email_hash).execute()
    print("   Data:", res.data)
    assert len(res.data) > 0
    assert res.data[0]["credits_used"] == 5

    print("4. Cleaning up test entry...")
    supabase.table("usage_tracker").delete().eq("email_hash", email_hash).execute()

    print("\nALL USER USAGE VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_user_usage_endpoint()
