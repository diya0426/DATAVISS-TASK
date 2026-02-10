from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import get_database, close_database, ensure_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = await get_database()
    await ensure_indexes(db)
    yield
    await close_database()


app = FastAPI(title="Dynamic Forms API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_db():
    return await get_database()


from routers import auth_router, forms_router, submissions_router, charts_router, public_router

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(forms_router.router, prefix="/api", tags=["forms"])
app.include_router(submissions_router.router, prefix="/api/submissions", tags=["submissions"])
app.include_router(charts_router.router, prefix="/api/charts", tags=["charts"])
app.include_router(public_router.router, prefix="/api/public", tags=["public"])
