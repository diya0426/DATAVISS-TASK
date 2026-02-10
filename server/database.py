from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient | None = None


async def get_database():
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongodb_uri)
    return client[settings.database_name]


async def close_database():
    global client
    if client:
        client.close()
        client = None


async def ensure_indexes(db):
    # Forms: slug unique for published lookup; status for listing
    await db.forms.create_index("slug", unique=True)
    await db.forms.create_index("status")
    await db.forms.create_index([("updatedAt", -1)])

    # Submissions: formId + createdAt for listing and time bucketing
    await db.submissions.create_index([("formId", 1), ("createdAt", -1)])
    await db.submissions.create_index("formId")

    # Charts: formId for listing by form
    await db.charts.create_index("formId")
    await db.charts.create_index([("createdAt", -1)])

    # Users: email unique
    await db.users.create_index("email", unique=True)
