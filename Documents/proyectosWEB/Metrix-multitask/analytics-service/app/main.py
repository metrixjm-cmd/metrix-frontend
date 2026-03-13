"""
METRIX Analytics Service — Sprint 17
Microservicio analítico Python/FastAPI para procesamiento avanzado de KPIs.

Responsabilidades:
  - Conectarse directamente a metrix_db (MongoDB) en modo async vía motor.
  - Exponer endpoints de análisis que el backend Spring Boot puede consumir
    o que el frontend Angular puede llamar directamente (CORS habilitado).
  - Desplegarse como contenedor en Google Cloud Run (puerto 8080).

Stack: FastAPI · motor (async MongoDB) · pandas · numpy · python-dotenv
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pandas as pd
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from motor.motor_asyncio import AsyncIOMotorClient

# ── Configuración ────────────────────────────────────────────────────────────

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("metrix-analytics")

MONGODB_URL     = os.getenv("MONGODB_URL",     "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "metrix_db")
API_KEY         = os.getenv("METRIX_API_KEY",  "dev-internal-key")

# ── API Key auth ─────────────────────────────────────────────────────────────

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(key: str = Security(api_key_header)):
    if key == API_KEY:
        return key
    raise HTTPException(status_code=401, detail="API key inválida o ausente")

# ── Ciclo de vida: startup / shutdown ────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Abre la conexión a MongoDB al arrancar y la cierra al apagar.
    motor.AsyncIOMotorClient es thread-safe y debe ser un singleton.
    """
    logger.info("Conectando a MongoDB: %s/%s", MONGODB_URL, MONGODB_DB_NAME)
    app.state.mongo = AsyncIOMotorClient(
        MONGODB_URL,
        maxPoolSize=50,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
    )
    app.state.db    = app.state.mongo[MONGODB_DB_NAME]
    logger.info("Conexión MongoDB establecida")
    yield
    app.state.mongo.close()
    logger.info("Conexión MongoDB cerrada")

# ── Aplicación FastAPI ───────────────────────────────────────────────────────

app = FastAPI(
    title       = "METRIX Analytics Service",
    description = "Microservicio analítico para METRIX — KPIs avanzados con pandas/numpy",
    version     = "0.1.0",
    lifespan    = lifespan,
)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:4200,http://localhost:8080").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = CORS_ORIGINS,
    allow_credentials = False,
    allow_methods     = ["GET"],
    allow_headers     = ["content-type", "x-api-key"],
)

# ── Health check (requerido por Cloud Run) ───────────────────────────────────

@app.get("/health", tags=["Infra"])
async def health():
    """
    Endpoint de health check para Google Cloud Run y load balancers.
    Cloud Run espera HTTP 200 en este path para considerar el servicio healthy.
    """
    return {"status": "ok", "service": "metrix-analytics", "version": "0.1.0"}

# ── Endpoints analíticos ─────────────────────────────────────────────────────

@app.get("/api/v1/analytics/test-kpi", tags=["Analytics"], dependencies=[Depends(verify_api_key)])
async def test_kpi():
    """
    Endpoint de integración inicial: conecta a la colección `tasks` de metrix_db
    y devuelve conteos básicos agrupados por estado de ejecución.

    Prueba que:
      1. La conexión async a MongoDB funciona correctamente.
      2. pandas puede construir un DataFrame desde documentos MongoDB.
      3. El microservicio responde con datos reales del sistema METRIX.
    """
    try:
        db = app.state.db

        # Proyección mínima para no traer documentos completos
        cursor = db["tasks"].find(
            {},
            {"_id": 0, "execution.status": 1, "activo": 1, "store_id": 1}
        )
        docs = await cursor.to_list(length=10_000)

        if not docs:
            return {
                "status"  : "ok",
                "message" : "Colección tasks vacía — agrega tareas desde el backend Java.",
                "data"    : {"total_tasks": 0},
            }

        # Normaliza los documentos anidados con pandas
        df = pd.json_normalize(docs)

        total_tasks  = len(df)
        active_tasks = int(df.get("activo", pd.Series(dtype=bool)).sum()) if "activo" in df.columns else 0

        # Conteo por estado si la columna existe
        status_counts: dict = {}
        status_col = "execution.status"
        if status_col in df.columns:
            status_counts = df[status_col].value_counts().to_dict()

        # Conteo por sucursal
        store_col = "store_id"
        store_counts: dict = {}
        if store_col in df.columns:
            store_counts = df[store_col].value_counts().to_dict()

        return {
            "status": "ok",
            "data": {
                "total_tasks"   : total_tasks,
                "active_tasks"  : active_tasks,
                "by_status"     : status_counts,
                "by_store"      : store_counts,
                "pandas_version": pd.__version__,
            },
        }

    except Exception as exc:
        logger.error("MongoDB query failed in test-kpi: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail="Analytics service temporarily unavailable")


@app.get("/api/v1/analytics/on-time-rate", tags=["Analytics"], dependencies=[Depends(verify_api_key)])
async def on_time_rate():
    """
    KPI #1 — On-Time Rate global y desglosado por sucursal.

    Fórmula:
        on_time_rate = (tareas COMPLETED con execution.on_time == True)
                       ─────────────────────────────────────────────────  × 100
                             total de tareas en cualquier estado

    El campo `execution.on_time` lo establece el backend Java al completar
    la tarea: True si finishedAt ≤ dueAt, False en caso contrario.
    Para tareas PENDING o IN_PROGRESS el campo es null → se contabiliza como False.

    La respuesta está diseñada para ser consumida directamente por:
      - Dashboards Angular (estructura flat por sucursal, listo para @for)
      - Agentes CrewAI (campo `metric` y `computed_at` para trazabilidad)
    """
    try:
        db = app.state.db

        # Proyección mínima: solo los campos necesarios para el cálculo
        cursor = db["tasks"].find(
            {},
            {
                "_id"              : 0,
                "store_id"         : 1,
                "execution.status" : 1,
                "execution.on_time": 1,
            },
        )
        docs = await cursor.to_list(length=10_000)

        if not docs:
            return {
                "status"     : "ok",
                "metric"     : "on_time_rate",
                "computed_at": datetime.now(timezone.utc).isoformat(),
                "message"    : "No hay tareas registradas en metrix_db.",
                "data"       : None,
            }

        # pd.json_normalize aplana execution.status → "execution.status"
        #                             execution.on_time → "execution.on_time"
        df = pd.json_normalize(docs)

        # Garantiza que las columnas existan aunque ningún doc las tenga
        for col in ("execution.status", "execution.on_time", "store_id"):
            if col not in df.columns:
                df[col] = None

        # ── Cálculo global ────────────────────────────────────────────────────
        total          = len(df)
        on_time_mask   = (
            (df["execution.status"] == "COMPLETED")
            & df["execution.on_time"].fillna(False).astype(bool)
        )
        completed_on_time  = int(on_time_mask.sum())
        global_rate        = round(completed_on_time / total * 100, 2) if total else 0.0

        # Desglose por estado — contexto para interpretar el KPI
        status_breakdown = (
            df["execution.status"]
            .fillna("UNKNOWN")
            .value_counts()
            .rename_axis("status")
            .reset_index(name="count")
            .to_dict(orient="records")
        )

        # ── Cálculo por sucursal ──────────────────────────────────────────────
        by_store: list[dict] = []

        if df["store_id"].notna().any():
            for store_id, group in df.groupby("store_id", dropna=True):
                store_total    = len(group)
                store_on_time  = int(
                    (
                        (group["execution.status"] == "COMPLETED")
                        & group["execution.on_time"].fillna(False).astype(bool)
                    ).sum()
                )
                store_rate = round(store_on_time / store_total * 100, 2) if store_total else 0.0
                by_store.append(
                    {
                        "store_id"        : store_id,
                        "total_tasks"     : store_total,
                        "completed_on_time": store_on_time,
                        "on_time_rate"    : store_rate,
                    }
                )

            # Ordena descendente para que el mejor performer aparezca primero
            by_store.sort(key=lambda x: x["on_time_rate"], reverse=True)

        # ── Respuesta ─────────────────────────────────────────────────────────
        return {
            "status"     : "ok",
            "metric"     : "on_time_rate",
            "description": (
                "Porcentaje de tareas completadas dentro del plazo "
                "sobre el total de tareas en cualquier estado"
            ),
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "data": {
                "global": {
                    "total_tasks"      : total,
                    "completed_on_time": completed_on_time,
                    "on_time_rate"     : global_rate,
                },
                "status_breakdown": status_breakdown,
                "by_store"        : by_store,
            },
        }

    except Exception as exc:
        logger.error("on_time_rate calculation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail="Analytics service temporarily unavailable")


# ── IGEO helper ───────────────────────────────────────────────────────────────

_IGEO_WEIGHTS = {
    "cumplimiento" : 0.40,
    "tiempo"       : 0.25,
    "calidad"      : 0.20,
    "consistencia" : 0.15,
}

def _igeo_pillars(df: pd.DataFrame) -> dict:
    """
    Calcula los 4 pilares del IGEO y el score final ponderado para cualquier
    sub-conjunto del DataFrame (global o por sucursal).

    Pilares
    -------
    cumplimiento  = (COMPLETED / total) × 100
    tiempo        = (COMPLETED ∧ on_time / COMPLETED) × 100
    calidad       = (media de quality_rating / 5.0) × 100   ← sólo tareas con rating
    consistencia  = (COMPLETED ∧ rework_count == 0 / COMPLETED) × 100

    IGEO = cumplimiento×0.40 + tiempo×0.25 + calidad×0.20 + consistencia×0.15

    Nota sobre campos MongoDB
    -------------------------
    • quality_rating y rework_count son raíz-level (no sub-documento "audit").
    • store_id es raíz-level (no sub-documento "assignment").
    • execution.on_time y execution.status sí son sub-documento "execution".
    Los nombres de columna llegan ya aplanados por pd.json_normalize().
    """
    total = len(df)
    if total == 0:
        return {
            "total_tasks"       : 0,
            "completed"         : 0,
            "pillar_scores"     : {
                "cumplimiento" : 0.0,
                "tiempo"       : 0.0,
                "calidad"      : 0.0,
                "consistencia" : 0.0,
            },
            "igeo"              : 0.0,
        }

    completed_mask = df["execution.status"] == "COMPLETED"
    completed      = int(completed_mask.sum())

    # ── Pilar 1: Cumplimiento ─────────────────────────────────────────────────
    cumplimiento = round(completed / total * 100, 2)

    # ── Pilar 2: Tiempo (on-time dentro de las completadas) ───────────────────
    if completed > 0:
        on_time_count = int(
            (completed_mask & df["execution.on_time"].fillna(False).astype(bool)).sum()
        )
        tiempo = round(on_time_count / completed * 100, 2)
    else:
        tiempo = 0.0

    # ── Pilar 3: Calidad (quality_rating normalizado a base 100) ─────────────
    # Solo se considera la calificación de las tareas COMPLETADAS con rating asignado.
    # quality_rating oscila de 1.0 a 5.0 → (media / 5.0) × 100.
    valid_ratings = df.loc[completed_mask, "quality_rating"].dropna()
    if len(valid_ratings) > 0:
        calidad = round((valid_ratings.mean() / 5.0) * 100, 2)
    else:
        calidad = 0.0

    # ── Pilar 4: Consistencia (completadas sin re-trabajo) ───────────────────
    if completed > 0:
        no_rework = int(
            (completed_mask & (df["rework_count"].fillna(0).astype(int) == 0)).sum()
        )
        consistencia = round(no_rework / completed * 100, 2)
    else:
        consistencia = 0.0

    # ── IGEO ponderado ────────────────────────────────────────────────────────
    igeo = round(
        cumplimiento  * _IGEO_WEIGHTS["cumplimiento"]
        + tiempo      * _IGEO_WEIGHTS["tiempo"]
        + calidad     * _IGEO_WEIGHTS["calidad"]
        + consistencia * _IGEO_WEIGHTS["consistencia"],
        2,
    )

    return {
        "total_tasks"  : total,
        "completed"    : completed,
        "pillar_scores": {
            "cumplimiento" : cumplimiento,
            "tiempo"       : tiempo,
            "calidad"      : calidad,
            "consistencia" : consistencia,
        },
        "igeo"         : igeo,
    }


@app.get("/api/v1/analytics/igeo", tags=["Analytics"], dependencies=[Depends(verify_api_key)])
async def igeo():
    """
    KPI #10 — IGEO: Índice Global de Ejecución Operativa.

    KPI compuesto que sintetiza el desempeño operativo de una sucursal en un
    único número (0-100) a partir de cuatro pilares ponderados:

        IGEO = Cumplimiento×0.40 + Tiempo×0.25 + Calidad×0.20 + Consistencia×0.15

    Pilares
    -------
    cumplimiento  Porcentaje de tareas llevadas a COMPLETED sobre el total.
    tiempo        Porcentaje de COMPLETED entregadas dentro del plazo (on_time).
    calidad       Media del quality_rating (1-5) normalizado a base 100.
                  Solo se consideran COMPLETED con calificación asignada.
    consistencia  Porcentaje de COMPLETED sin ningún ciclo de re-trabajo.

    Campos MongoDB usados
    ---------------------
    execution.status   → nested bajo "execution"   (aplanado por json_normalize)
    execution.on_time  → nested bajo "execution"   (aplanado por json_normalize)
    quality_rating     → raíz del documento        (NOT "audit.quality_rating")
    rework_count       → raíz del documento        (NOT "audit.rework_count")
    store_id           → raíz del documento        (NOT "assignment.store_id")

    La respuesta incluye `weights` y `pillar_scores` explícitos para que
    agentes CrewAI puedan razonar sobre qué pilar deprime el IGEO y
    recomendar acciones correctivas específicas.
    """
    try:
        db = app.state.db

        # Proyección estricta — solo los 5 campos necesarios para el cálculo
        cursor = db["tasks"].find(
            {},
            {
                "_id"              : 0,
                "store_id"         : 1,
                "execution.status" : 1,
                "execution.on_time": 1,
                "quality_rating"   : 1,
                "rework_count"     : 1,
            },
        )
        docs = await cursor.to_list(length=10_000)

        if not docs:
            return {
                "status"     : "ok",
                "metric"     : "igeo",
                "computed_at": datetime.now(timezone.utc).isoformat(),
                "message"    : "No hay tareas registradas en metrix_db.",
                "data"       : None,
            }

        df = pd.json_normalize(docs)

        # Garantiza que todas las columnas existan aunque ningún doc las tenga
        for col in (
            "execution.status",
            "execution.on_time",
            "quality_rating",
            "rework_count",
            "store_id",
        ):
            if col not in df.columns:
                df[col] = None

        # ── Global ────────────────────────────────────────────────────────────
        global_result = _igeo_pillars(df)

        # ── Por sucursal ──────────────────────────────────────────────────────
        by_store: list[dict] = []

        if df["store_id"].notna().any():
            for store_id, group in df.groupby("store_id", dropna=True):
                store_result = _igeo_pillars(group.reset_index(drop=True))
                by_store.append({"store_id": store_id, **store_result})

            # Ordena descendente: la sucursal con mejor IGEO aparece primero
            by_store.sort(key=lambda x: x["igeo"], reverse=True)

        # ── Respuesta ─────────────────────────────────────────────────────────
        return {
            "status"     : "ok",
            "metric"     : "igeo",
            "description": (
                "Índice Global de Ejecución Operativa — "
                "KPI compuesto ponderado (0-100)"
            ),
            "weights"    : _IGEO_WEIGHTS,
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "data"       : {
                "global"  : global_result,
                "by_store": by_store,
            },
        }

    except Exception as exc:
        logger.error("IGEO calculation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail="Analytics service temporarily unavailable")
