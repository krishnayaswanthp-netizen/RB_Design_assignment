import hashlib
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_email_hash(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode("utf-8")).hexdigest()

def test_usage_tracker_integration():
    print("1. Testing email hash function...")
    test_email = "testuser_verify@example.com"
    email_hash = get_email_hash(test_email)
    print(f"   Email: {test_email}")
    print(f"   SHA-256 Hash: {email_hash}")
    assert len(email_hash) == 64, "Hash should be 64 characters long hex"

    print("2. Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    print("3. Inserting test row into usage_tracker...")
    upsert_res = supabase.table("usage_tracker").upsert({
        "email_hash": email_hash,
        "credits_used": 1
    }).execute()
    print("   Upsert result data:", upsert_res.data)

    print("4. Fetching row from usage_tracker...")
    select_res = supabase.table("usage_tracker").select("*").eq("email_hash", email_hash).execute()
    print("   Select result data:", select_res.data)
    assert len(select_res.data) > 0, "Record should exist in usage_tracker"
    assert select_res.data[0]["credits_used"] == 1, "credits_used should be 1"

    print("5. Incrementing credits_used to 5...")
    increment_res = supabase.table("usage_tracker").upsert({
        "email_hash": email_hash,
        "credits_used": 5
    }).execute()
    print("   Increment result data:", increment_res.data)

    print("6. Cleaning up test row...")
    delete_res = supabase.table("usage_tracker").delete().eq("email_hash", email_hash).execute()
    print("   Delete result data:", delete_res.data)

    print("\nALL USAGE_TRACKER VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_usage_tracker_integration()
