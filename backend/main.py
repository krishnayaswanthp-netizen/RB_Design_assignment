import hashlib
import logging
import os

import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import create_client

from chains.screening_chain import build_screening_pipeline


load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_DASHBOARD_URL = "http://localhost:5173/dashboard"

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

if not STRIPE_SECRET_KEY:
    raise RuntimeError("STRIPE_SECRET_KEY is required")

stripe.api_key = STRIPE_SECRET_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
security = HTTPBearer()


def get_email_hash(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode("utf-8")).hexdigest()


class AuthUser(BaseModel):
    id: str
    email: str


async def get_auth_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    token = credentials.credentials
    try:
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authentication token.",
            )
        return AuthUser(
            id=user_res.user.id,
            email=user_res.user.email or "",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication error: {str(exc)}",
        ) from exc


async def get_auth_user_id(
    auth_user: AuthUser = Depends(get_auth_user),
) -> str:
    return auth_user.id


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    user_id: str
    job_description: str
    resume_text: str


class CheckoutSessionRequest(BaseModel):
    user_id: str


@app.get("/")
def health_check():
    return {"status": "ok", "message": "API running"}


@app.get("/api/user/usage")
async def get_user_usage(auth_user: AuthUser = Depends(get_auth_user)):
    email_hash = get_email_hash(auth_user.email)
    res = supabase.table("usage_tracker").select("credits_used").eq("email_hash", email_hash).execute()
    credits_used = res.data[0]["credits_used"] if res.data and len(res.data) > 0 else 0
    return {"credits_used": credits_used, "limit": 5}


@app.post("/api/review")
def review_resume(
    payload: ReviewRequest,
    auth_user: AuthUser = Depends(get_auth_user),
):
    ensure_request_user(payload.user_id, auth_user.id)

    user = get_user(payload.user_id)
    plan_tier = user.get("plan_tier", "free")
    usage_count = int(user.get("usage_count") or 0)

    # Compute SHA-256 email hash for usage tracking
    user_email = auth_user.email
    email_hash = get_email_hash(user_email) if user_email else None

    credits_used = 0
    if email_hash:
        try:
            tracker_res = (
                supabase.table("usage_tracker")
                .select("credits_used")
                .eq("email_hash", email_hash)
                .execute()
            )
            if tracker_res.data and len(tracker_res.data) > 0:
                credits_used = int(tracker_res.data[0].get("credits_used") or 0)
        except Exception as tracker_err:
            logger.warning(f"Error querying usage_tracker: {tracker_err}")

    effective_usage = max(usage_count, credits_used)

    if plan_tier == "free" and effective_usage >= 5:
        raise HTTPException(
            status_code=429,
            detail="Credit limit reached (5/5 scans used). Account re-registration does not reset credits.",
        )

    try:
        pipeline = build_screening_pipeline()
        result = pipeline.invoke(
            {
                "job_description": payload.job_description,
                "resume_text": payload.resume_text,
            }
        )

        score = int(result.get("score"))
        feedback = result.get("explanation")
        if not feedback:
            raise ValueError("Missing explanation in AI response")
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI Processing failed: {exc}",
        ) from exc

    stored_feedback = f"Score: {score}/100\n\n{feedback}"
    insert_review(payload, stored_feedback)

    updated_usage_count = effective_usage + 1
    update_user_usage(payload.user_id, updated_usage_count)

    # Update or insert usage_tracker for persistent email hash credits
    if email_hash:
        try:
            supabase.table("usage_tracker").upsert(
                {
                    "email_hash": email_hash,
                    "credits_used": updated_usage_count,
                }
            ).execute()
        except Exception as tracker_upsert_err:
            logger.warning(f"Error updating usage_tracker: {tracker_upsert_err}")

    return {
        "success": True,
        "score": score,
        "feedback": feedback,
        "usage_count": updated_usage_count,
        "plan_tier": plan_tier,
    }


@app.post("/api/create-checkout-session")
def create_checkout_session(
    payload: CheckoutSessionRequest,
    auth_user_id: str = Depends(get_auth_user_id),
):
    ensure_request_user(payload.user_id, auth_user_id)

    if not STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=500, detail="STRIPE_PRO_PRICE_ID is required")

    get_user(payload.user_id)

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": STRIPE_PRO_PRICE_ID, "quantity": 1}],
        client_reference_id=payload.user_id,
        success_url=f"{FRONTEND_DASHBOARD_URL}?payment=success",
        cancel_url=f"{FRONTEND_DASHBOARD_URL}?payment=cancelled",
    )

    return {"url": session.url}


@app.post("/api/create-portal-session")
def create_portal_session(
    request: Request,
    auth_user_id: str = Depends(get_auth_user_id),
):
    user = get_user(auth_user_id)
    stripe_customer_id = user.get("stripe_customer_id")

    if not stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail="No active Stripe customer found for this account. Please subscribe first.",
        )

    origin = request.headers.get("origin")
    return_url = f"{origin}/dashboard" if origin else FRONTEND_DASHBOARD_URL

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=return_url,
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(exc)}") from exc

    return {"url": portal_session.url}


@app.post("/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET is required")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")

        if not user_id:
            logger.warning("Ignoring checkout.session.completed without client_reference_id")
            return {"status": "ignored", "reason": "Missing client_reference_id"}

        update_user_plan(
            user_id=user_id,
            plan_tier="pro",
            stripe_customer_id=session.get("customer"),
        )

    return {"status": "success"}


@app.delete("/api/user/delete")
async def delete_account(
    user_id: str,
    auth_user_id: str = Depends(get_auth_user_id),
):
    ensure_request_user(user_id, auth_user_id)

    try:
        # Delete user evaluations if evaluations table exists
        try:
            supabase.table("evaluations").delete().eq("user_id", user_id).execute()
        except Exception as exc:
            logger.warning(f"Evaluations cleanup skipped: {exc}")

        # Delete user reviews if reviews table exists
        try:
            supabase.table("reviews").delete().eq("user_id", user_id).execute()
        except Exception as exc:
            logger.warning(f"Reviews cleanup skipped: {exc}")

        # Delete user record
        try:
            supabase.table("users").delete().eq("id", user_id).execute()
        except Exception as exc:
            logger.warning(f"Users table cleanup skipped: {exc}")

        # Delete user from Supabase Auth via Service Role admin client
        supabase.auth.admin.delete_user(user_id)

        return {"status": "success", "message": "Account deleted successfully"}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting account: {str(exc)}",
        ) from exc


def ensure_request_user(request_user_id: str, auth_user_id: str) -> None:
    if request_user_id != auth_user_id:
        raise HTTPException(status_code=403, detail="Authenticated user mismatch")


def get_user(user_id: str) -> dict:
    response = (
        supabase.table("users")
        .select("id, plan_tier, usage_count, stripe_customer_id")
        .eq("id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return response.data[0]


def insert_review(payload: ReviewRequest, feedback: str) -> None:
    response = (
        supabase.table("reviews")
        .insert(
            {
                "user_id": payload.user_id,
                "job_description": payload.job_description,
                "resume_text": payload.resume_text,
                "feedback": feedback,
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to store review")


def update_user_usage(user_id: str, usage_count: int) -> None:
    supabase.table("users").update({"usage_count": usage_count}).eq("id", user_id).execute()


def update_user_plan(user_id: str, plan_tier: str, stripe_customer_id: str | None) -> None:
    update_payload = {"plan_tier": plan_tier}
    if stripe_customer_id:
        update_payload["stripe_customer_id"] = stripe_customer_id

    supabase.table("users").update(update_payload).eq("id", user_id).execute()