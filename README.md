# AI Resume Screener SaaS

A full-stack AI resume screening platform that evaluates candidate resumes against job descriptions, returns an ATS-style match score, explains recruiter reasoning, tracks usage limits, and supports Stripe subscriptions.

The project began as a CLI-based LangChain resume evaluator and has been expanded into a SaaS workflow with authentication, billing, resume upload parsing, saved evaluation history, and account management.

## What It Does

AI Resume Screener helps recruiters, hiring managers, and candidates compare a resume against a specific job description.

Core workflow:

1. A user signs in with Supabase Auth.
2. The user uploads a resume file or pastes resume text.
3. The user pastes a job description.
4. The backend runs a LangChain + Groq LLM screening pipeline.
5. The app returns:
   - ATS match score from 0 to 100
   - Detailed recruiter-style reasoning
   - Missing or matching skill analysis
   - Suggested resume bullet points
6. Usage is tracked by plan tier.
7. Free users get 5 evaluations; Pro users get unlimited evaluations via Stripe subscription.

## Feature Overview

### Frontend

- React + TypeScript + Vite
- Tailwind CSS interface
- Supabase email/password authentication
- Public landing page with pricing
- Protected dashboard route
- Resume upload support for:
  - PDF via `pdfjs-dist`
  - DOCX via `mammoth`
  - TXT via browser file APIs
- Paste-text fallback mode
- ATS match score visualization
- Copyable resume improvement bullet points
- Evaluation history/memory
- Profile page with account deletion
- Stripe Checkout upgrade flow
- Stripe Billing Portal management for Pro users

### Backend

- FastAPI API server
- Supabase service-role integration
- Supabase JWT validation via `HTTPBearer`
- LangChain LCEL screening pipeline
- Groq-hosted Llama model through `langchain-groq`
- Free-tier usage enforcement
- Persistent usage tracking by hashed email
- Review/evaluation persistence
- Stripe Checkout subscription sessions
- Stripe Customer Portal sessions
- Stripe webhook handling
- Authenticated account deletion

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Routing | React Router |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| Backend | FastAPI, Pydantic, Uvicorn |
| AI Chain | LangChain Core, LangChain Groq |
| LLM | Groq `llama-3.3-70b-versatile` |
| Billing | Stripe Checkout, Stripe Billing Portal, Stripe Webhooks |
| File Parsing | pdfjs-dist, mammoth, browser File API |

## Repository Structure

```txt
ai-resume-screening-system-project/
  backend/
    main.py
    requirements.txt
    chains/
      screening_chain.py
    prompts/
      templates.py
    data/
      jd.txt
      resume_avg.txt
      resume_strong.txt
      resume_weak.txt

  frontend/
    package.json
    vite.config.ts
    src/
      App.tsx
      supabaseClient.ts
      types.d.ts
      components/
        Auth.tsx
        Dashboard.tsx
        Header.tsx
        LandingPage.tsx
        Profile.tsx
      index.css
      main.tsx
```

## Backend API

Base URL during local development:

```txt
http://localhost:8000
```

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Health check |
| POST | `/webhook` | Stripe webhook receiver |

### Authenticated

These endpoints require a Supabase access token:

```http
Authorization: Bearer <supabase_access_token>
```

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/user/usage` | Returns persistent free-tier usage count |
| POST | `/api/review` | Runs resume screening and stores result |
| POST | `/api/create-checkout-session` | Creates Stripe subscription checkout session |
| POST | `/api/create-portal-session` | Creates Stripe billing portal session |
| DELETE | `/api/user/delete` | Deletes user account and stored records |

## Environment Variables

### Backend: `backend/.env`

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_PRO_PRICE_ID=price_id_for_pro_subscription
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret

GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=optional_if_needed
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=optional_langsmith_key
LANGCHAIN_PROJECT=optional_project_name
```

Important: never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

### Frontend: `frontend/.env.local`

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
VITE_API_BASE_URL=http://localhost:8000
```

## Supabase Tables

The current app expects the following tables.

### `users`

Stores plan and Stripe metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid/text | Supabase Auth user id |
| `plan_tier` | text | `free` or `pro` |
| `usage_count` | integer | User-visible usage count |
| `stripe_customer_id` | text | Stripe customer id after checkout |

### `reviews`

Stores backend-created review records.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid/text | User id |
| `job_description` | text | Submitted JD |
| `resume_text` | text | Parsed resume text |
| `feedback` | text | Score-prefixed LLM feedback |
| `created_at` | timestamp | Default timestamp |

### `evaluations`

Stores frontend evaluation memory/history.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid/text | User id |
| `job_description` | text | Submitted JD |
| `match_score` | integer | Returned ATS score |
| `feedback` | text/json | Returned feedback |
| `created_at` | timestamp | Default timestamp |

### `usage_tracker`

Stores persistent free-tier usage by hashed email.

| Column | Type | Notes |
| --- | --- | --- |
| `email_hash` | text | SHA-256 hash of normalized email |
| `credits_used` | integer | Free evaluations used |

## Local Setup

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd ai-resume-screening-system-project
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` using the backend variables above.

Run the API:

```bash
uvicorn main:app --reload --port 8000
```

The API should respond at:

```txt
http://localhost:8000/
```

Expected health response:

```json
{
  "status": "ok",
  "message": "API running"
}
```

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app should run at:

```txt
http://localhost:5173
```

## Stripe Setup

1. Create a Stripe product for the Pro plan.
2. Create a recurring price for `$15/month`.
3. Put the price id in `STRIPE_PRO_PRICE_ID`.
4. Configure a webhook endpoint:

```txt
POST /webhook
```

For local development, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:8000/webhook
```

Copy the generated webhook secret into:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

The backend currently handles:

```txt
checkout.session.completed
```

When checkout completes, the user is upgraded to `pro` and the Stripe customer id is stored.

## AI Screening Pipeline

The screening pipeline lives in:

```txt
backend/chains/screening_chain.py
backend/prompts/templates.py
```

It runs two LangChain steps:

1. Extract strict recruiter analysis from resume + job description.
2. Score the candidate and return JSON:

```json
{
  "score": 85,
  "explanation": "Detailed recruiter reasoning..."
}
```

The backend maps:

```txt
explanation -> feedback
```

The API response from `/api/review` is:

```json
{
  "success": true,
  "score": 85,
  "feedback": "Detailed recruiter reasoning...",
  "usage_count": 1,
  "plan_tier": "free"
}
```

## Usage Limits

Free users are limited to 5 resume evaluations.

The backend checks both:

- `users.usage_count`
- `usage_tracker.credits_used`

The effective usage is the maximum of both values. This helps prevent a user from resetting credits by re-registering with the same email.

Pro users have unlimited evaluations.

## File Upload Behavior

Resume files are parsed on the client before being sent to the backend.

| File Type | Parser |
| --- | --- |
| `.txt` | Browser File API |
| `.pdf` | `pdfjs-dist` |
| `.docx` | `mammoth` |

Only parsed resume text is sent to the backend. The uploaded file itself is not stored by the backend.

## Security Notes

- Protected API routes require a Supabase JWT.
- The backend validates the JWT with Supabase before serving protected requests.
- The backend checks that request `user_id` matches the authenticated user id.
- Supabase service role credentials stay server-side only.
- Stripe webhook requests are verified with `STRIPE_WEBHOOK_SECRET`.
- CORS is currently permissive for development and deployment flexibility:

```python
allow_origins=["*"]
allow_methods=["*"]
allow_headers=["*"]
```

For production, consider restricting origins to your deployed frontend domain.

## Useful Commands

### Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

### Frontend lint

```bash
cd frontend
npm run lint
```

## Current Limitations

- Usage count increments use a simple read/update flow, so concurrent requests can race.
- Large PDF parsing increases the frontend bundle size because `pdfjs-dist` ships a large worker.
- The LLM response must be valid JSON; malformed output is caught and returned as an AI processing error.
- Some UI strings currently contain encoding artifacts from copied symbols; these can be cleaned in a later UI polish pass.

## Project Status

Implemented:

- Full-stack SaaS architecture
- Authenticated dashboard
- Resume upload parsing
- LLM resume evaluation
- Free-tier usage enforcement
- Stripe subscription checkout
- Stripe billing portal
- Evaluation history
- Profile and account deletion

Next good improvements:

- Add database migrations or SQL schema files
- Add backend tests for auth and billing routes
- Add atomic usage increment RPC in Supabase
- Code-split PDF parsing to reduce the initial frontend bundle
- Restrict production CORS origins
