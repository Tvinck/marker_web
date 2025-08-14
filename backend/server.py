from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

allowed_admins = [a for a in os.environ.get("ALLOWED_ADMINS", "").split(",") if a]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


class User(BaseModel):
    id: str
    name: Optional[str] = None
    avatarUrl: Optional[str] = None
    role: Literal['user', 'admin'] = 'user'
    isPro: bool = False
    proUntil: Optional[datetime] = None
    prefix: Optional[str] = None
    points: int = 50
    dailyClaimedAt: Optional[datetime] = None
    settings: dict = Field(default_factory=lambda: {"mapStyle": "classic"})
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class Location(BaseModel):
    lng: float
    lat: float


class Marker(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    title: str
    description: Optional[str] = None
    location: Location
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    createdBy: str
    status: Literal['pending', 'active', 'rejected'] = 'pending'
    confirmations: int = 0
    confirmationsBy: List[str] = Field(default_factory=list)


class MarkerCreate(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    location: Location


class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    markerId: str
    userId: str
    text: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class CommentCreate(BaseModel):
    text: str


class Rating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    markerId: str
    userId: str
    value: int
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class RatingCreate(BaseModel):
    value: int


class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    type: Literal['create_marker', 'confirm', 'comment', 'rate', 'daily']
    points: int
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    meta: Optional[dict] = None


class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    status: Literal['active', 'expired'] = 'active'
    type: Literal['trial', 'paid', 'free_top', 'points']
    startAt: datetime
    endAt: datetime
    source: Literal['enot', 'points', 'top10']
    priceRub: Optional[int] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    provider: str = 'enot'
    externalId: str
    amountRub: int
    status: Literal['created', 'pending', 'success', 'fail'] = 'created'
    linkUrl: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    meta: Optional[dict] = None


class PaymentCreateRequest(BaseModel):
    plan: Literal['trial', 'monthly']


class EnotWebhook(BaseModel):
    paymentId: str
    status: str
    client_id: Optional[str] = None
    meta: Optional[dict] = None


async def get_or_create_user(client_id: str) -> User:
    user_data = await db.users.find_one({"id": client_id})
    if user_data:
        return User(**user_data)
    role = 'admin' if client_id in allowed_admins else 'user'
    user = User(id=client_id, role=role)
    await db.users.insert_one(user.dict())
    return user


async def add_activity(user_id: str, type_: str, points: int, meta: Optional[dict] = None):
    activity = Activity(userId=user_id, type=type_, points=points, meta=meta)
    await db.activities.insert_one(activity.dict())

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# Users
@api_router.get("/users/me")
async def get_current_user(client_id: str):
    user = await get_or_create_user(client_id)
    return {"user": user}


@api_router.post("/users/daily-claim")
async def daily_claim(client_id: str):
    user = await get_or_create_user(client_id)
    now = datetime.utcnow()
    if user.dailyClaimedAt and user.dailyClaimedAt.date() == now.date():
        return {"ok": False, "points": user.points, "dailyClaimedAt": user.dailyClaimedAt}
    await db.users.update_one({"id": user.id}, {"$set": {"dailyClaimedAt": now, "updatedAt": now}, "$inc": {"points": 10}})
    await add_activity(user.id, "daily", 10)
    user.dailyClaimedAt = now
    user.points += 10
    return {"ok": True, "points": user.points, "dailyClaimedAt": user.dailyClaimedAt}


# Markers
@api_router.get("/markers")
async def list_markers(client_id: str, types: Optional[str] = None):
    await get_or_create_user(client_id)
    query = {"status": "active"}
    if types:
        query["type"] = {"$in": types.split(",")}
    markers = await db.markers.find(query).to_list(1000)
    return [Marker(**m) for m in markers]


@api_router.get("/markers/{marker_id}")
async def get_marker(marker_id: str, client_id: str):
    await get_or_create_user(client_id)
    marker = await db.markers.find_one({"id": marker_id})
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    comments = await db.comments.find({"markerId": marker_id}).to_list(100)
    ratings = await db.ratings.find({"markerId": marker_id}).to_list(100)
    rating_avg = sum(r.get("value", 0) for r in ratings) / len(ratings) if ratings else None
    my_rating = next((r for r in ratings if r.get("userId") == client_id), None)
    return {
        "marker": Marker(**marker),
        "comments": [Comment(**c) for c in comments],
        "ratingAvg": rating_avg,
        "myRating": Rating(**my_rating) if my_rating else None,
    }


@api_router.post("/markers", response_model=Marker)
async def create_marker(client_id: str, marker_in: MarkerCreate):
    user = await get_or_create_user(client_id)
    marker = Marker(**marker_in.dict(), createdBy=user.id)
    await db.markers.insert_one(marker.dict())
    await add_activity(user.id, "create_marker", 5, {"markerId": marker.id})
    await db.users.update_one({"id": user.id}, {"$inc": {"points": 5}})
    return marker


@api_router.post("/markers/{marker_id}/confirm")
async def confirm_marker(marker_id: str, client_id: str):
    user = await get_or_create_user(client_id)
    marker = await db.markers.find_one({"id": marker_id})
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    if client_id not in marker.get("confirmationsBy", []):
        await db.markers.update_one({"id": marker_id}, {"$inc": {"confirmations": 1}, "$push": {"confirmationsBy": client_id}})
        await add_activity(user.id, "confirm", 2, {"markerId": marker_id})
        await db.users.update_one({"id": user.id}, {"$inc": {"points": 2}})
    marker = await db.markers.find_one({"id": marker_id})
    return {"marker": Marker(**marker)}


@api_router.post("/markers/{marker_id}/comment")
async def comment_marker(marker_id: str, client_id: str, comment_in: CommentCreate):
    user = await get_or_create_user(client_id)
    comment = Comment(markerId=marker_id, userId=user.id, text=comment_in.text)
    await db.comments.insert_one(comment.dict())
    await add_activity(user.id, "comment", 1, {"markerId": marker_id})
    await db.users.update_one({"id": user.id}, {"$inc": {"points": 1}})
    return {"comment": comment}


@api_router.post("/markers/{marker_id}/rate")
async def rate_marker(marker_id: str, client_id: str, rating_in: RatingCreate):
    user = await get_or_create_user(client_id)
    existing = await db.ratings.find_one({"markerId": marker_id, "userId": user.id})
    if existing:
        await db.ratings.update_one({"id": existing["id"]}, {"$set": {"value": rating_in.value}})
        rating = await db.ratings.find_one({"id": existing["id"]})
    else:
        rating = Rating(markerId=marker_id, userId=user.id, value=rating_in.value)
        await db.ratings.insert_one(rating.dict())
        await add_activity(user.id, "rate", 1, {"markerId": marker_id})
        await db.users.update_one({"id": user.id}, {"$inc": {"points": 1}})
    return {"rating": Rating(**rating)}


# Leaderboard
@api_router.get("/leaderboard")
async def get_leaderboard(client_id: str):
    await get_or_create_user(client_id)
    users = await db.users.find().sort("points", -1).limit(20).to_list(20)
    return [{"id": u["id"], "name": u.get("name"), "score": u.get("points", 0)} for u in users]


# Payments
@api_router.post("/payments/create")
async def create_payment(client_id: str, data: PaymentCreateRequest):
    user = await get_or_create_user(client_id)
    amount = 1 if data.plan == 'trial' else 149
    external_id = str(uuid.uuid4())
    payment = Payment(userId=user.id, externalId=external_id, amountRub=amount, linkUrl=f"https://pay.mock/{external_id}")
    await db.payments.insert_one(payment.dict())
    return {"paymentUrl": payment.linkUrl, "paymentId": payment.id}


@api_router.post("/payments/enot/webhook")
async def enot_webhook(payload: EnotWebhook):
    payment = await db.payments.find_one({"id": payload.paymentId})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.payments.update_one({"id": payment["id"]}, {"$set": {"status": payload.status, "updatedAt": datetime.utcnow()}})
    return {"ok": True}


# Subscriptions / PRO
@api_router.post("/pro/activate-from-points")
async def activate_pro_from_points(client_id: str):
    user = await get_or_create_user(client_id)
    if user.points < 1000:
        raise HTTPException(status_code=400, detail="Not enough points")
    new_until = datetime.utcnow() + timedelta(days=30)
    await db.users.update_one({"id": user.id}, {"$inc": {"points": -1000}, "$set": {"isPro": True, "proUntil": new_until}})
    sub = Subscription(userId=user.id, status='active', type='points', startAt=datetime.utcnow(), endAt=new_until, source='points')
    await db.subscriptions.insert_one(sub.dict())
    return {"ok": True, "user": await get_or_create_user(user.id)}


@api_router.get("/subscriptions/me")
async def subscriptions_me(client_id: str):
    user = await get_or_create_user(client_id)
    sub = await db.subscriptions.find_one({"userId": user.id, "status": "active"})
    sub_type = sub["type"] if sub else None
    return {"isPro": user.isPro, "proUntil": user.proUntil, "type": sub_type}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.server:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
    )
