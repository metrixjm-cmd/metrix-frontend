"""
METRIX Metrics Consumer — Fase 4

Worker asíncrono que subscribe al Redis Pub/Sub channel "metrix.events",
agrega las métricas con pandas, y las almacena en MongoDB para análisis.

Ejecutar como proceso independiente:
    python -m app.metrics_consumer

Requiere: Redis y MongoDB accesibles.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone

import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("metrics-consumer")

REDIS_URL       = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGODB_URL     = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "metrix_db")
CHANNEL         = "metrix.events"
BATCH_SIZE      = 50
FLUSH_INTERVAL  = 10  # seconds


async def process_batch(db, batch: list[dict]) -> None:
    """Procesa un lote de eventos de métricas y los almacena en MongoDB."""
    if not batch:
        return

    # Enriquecer cada evento con timestamp de procesamiento
    for event in batch:
        event["processed_at"] = datetime.now(timezone.utc).isoformat()

    await db["metrics_events"].insert_many(batch)
    logger.info("Stored %d metric events", len(batch))

    # Agregar por servicio/método para la colección de resumen
    from collections import Counter
    method_counts = Counter(f"{e.get('service', '?')}.{e.get('method', '?')}" for e in batch)

    # Upsert en metrics_aggregated: incrementar contadores
    for key, count in method_counts.items():
        service, method = key.split(".", 1)
        avg_duration = sum(
            e.get("durationMs", 0) for e in batch
            if e.get("service") == service and e.get("method") == method
        ) / count

        await db["metrics_aggregated"].update_one(
            {"service": service, "method": method, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
            {
                "$inc": {"count": count},
                "$set": {"avg_duration_ms": round(avg_duration, 2), "last_seen": datetime.now(timezone.utc)},
            },
            upsert=True,
        )


async def main() -> None:
    logger.info("Connecting to Redis: %s", REDIS_URL)
    redis = aioredis.from_url(REDIS_URL, decode_responses=True)

    logger.info("Connecting to MongoDB: %s/%s", MONGODB_URL, MONGODB_DB_NAME)
    mongo = AsyncIOMotorClient(MONGODB_URL)
    db = mongo[MONGODB_DB_NAME]

    # Crear índices
    await db["metrics_events"].create_index([("timestamp", -1)])
    await db["metrics_aggregated"].create_index([("service", 1), ("method", 1), ("date", 1)], unique=True)

    pubsub = redis.pubsub()
    await pubsub.subscribe(CHANNEL)
    logger.info("Subscribed to Redis channel: %s", CHANNEL)

    batch: list[dict] = []
    last_flush = asyncio.get_event_loop().time()

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            try:
                event = json.loads(message["data"])
                batch.append(event)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in metric event: %s", message["data"][:100])
                continue

            now = asyncio.get_event_loop().time()
            if len(batch) >= BATCH_SIZE or (now - last_flush) >= FLUSH_INTERVAL:
                await process_batch(db, batch)
                batch = []
                last_flush = now

    except asyncio.CancelledError:
        if batch:
            await process_batch(db, batch)
        logger.info("Consumer shut down gracefully")
    finally:
        await pubsub.unsubscribe(CHANNEL)
        await redis.aclose()
        mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
