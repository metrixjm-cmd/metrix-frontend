#!/usr/bin/env python3
"""
seed_data.py — Generador de datos de prueba para METRIX Analytics (Sprint 17)
══════════════════════════════════════════════════════════════════════════════

Inserta tareas ficticias en metrix_db.tasks respetando exactamente el esquema
de campos definido por los @Field de Task.java / Execution.java / StatusTransition.java.

Distribución predeterminada (configurable por CLI):
  PENDING    20 %  → sin timestamps de ejecución
  COMPLETED  60 %  → 72 % on_time=True, 28 % on_time=False
  FAILED     20 %  → on_time=False, rework_count > 0, comments

Prerrequisitos:
  · MongoDB corriendo en localhost:27017
  · Al menos 1 usuario en metrix_db.users  (backend Java levantado + login)
  · Al menos 1 sucursal en metrix_db.stores (creada desde el módulo Settings)

Uso:
  python seed_data.py                    # limpia tasks e inserta 75
  python seed_data.py --count 200        # inserta 200 tareas
  python seed_data.py --append           # agrega sin vaciar la colección
  python seed_data.py --count 50 --append
"""

from __future__ import annotations

import argparse
import asyncio
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# ── Configuración ─────────────────────────────────────────────────────────────

load_dotenv()

MONGODB_URL     = os.getenv("MONGODB_URL",     "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "metrix_db")

SEED = 42          # Reproducibilidad de los valores aleatorios
random.seed(SEED)

# ── Catálogos de datos ────────────────────────────────────────────────────────

SHIFTS:     list[str] = ["MATUTINO", "VESPERTINO", "NOCTURNO"]
CATEGORIES: list[str] = ["OPERACIONES", "RH", "CAPACITACION"]

POSITIONS: list[str] = [
    "Cocinero", "Cajero", "Mesero", "Supervisor de Piso",
    "Jefe de Cocina", "Auxiliar de Cocina", "Encargado de Almacén",
    "Repartidor", "Lavaplatos", "Hostess",
]

# Catálogo de tareas por categoría — título + descripción operativa real
TASK_CATALOG: dict[str, list[dict[str, str]]] = {
    "OPERACIONES": [
        {
            "title"      : "Verificación de inventario de cocina",
            "description": "Contar y registrar existencias de ingredientes principales antes de la apertura del turno.",
        },
        {
            "title"      : "Apertura de sucursal y chequeo de equipo",
            "description": "Encendido, calibración y prueba de funcionamiento de todos los equipos de cocina y POS.",
        },
        {
            "title"      : "Limpieza profunda de área de preparación",
            "description": "Desinfección de superficies, equipos y pisos según protocolo sanitario NOM-251 vigente.",
        },
        {
            "title"      : "Control de temperatura de refrigeradores",
            "description": "Registrar temperaturas de cada equipo de refrigeración en bitácora física y en sistema.",
        },
        {
            "title"      : "Reporte de merma diaria",
            "description": "Capturar en sistema todas las mermas del turno indicando causa y responsable.",
        },
        {
            "title"      : "Abastecimiento de insumos para turno vespertino",
            "description": "Solicitar y colocar insumos en estaciones de trabajo para el siguiente turno.",
        },
        {
            "title"      : "Revisión de caja chica y arqueo",
            "description": "Cuadrar el efectivo con los recibos del turno y reportar diferencias al gerente.",
        },
        {
            "title"      : "Supervisión de protocolo de atención al cliente",
            "description": "Verificar que el equipo de piso cumpla con tiempos y estándares de servicio definidos.",
        },
        {
            "title"      : "Checklist de cierre nocturno",
            "description": "Completar lista de verificación de cierre: limpieza, seguridad, apagado de equipos y registros.",
        },
        {
            "title"      : "Control de calidad en presentación de platillos",
            "description": "Revisar gramajes, temperatura de salida y presentación visual antes de entregar al cliente.",
        },
        {
            "title"      : "Revisión de uniformes del personal",
            "description": "Verificar que todo el equipo cumpla con el estándar de imagen corporativa METRIX.",
        },
        {
            "title"      : "Mantenimiento preventivo de equipo de cocina",
            "description": "Ejecutar rutina de limpieza profunda y lubricación según manual de mantenimiento del proveedor.",
        },
        {
            "title"      : "Auditoría de desperdicios y merma",
            "description": "Analizar causas de desperdicio semanal y proponer acciones correctivas al gerente.",
        },
        {
            "title"      : "Calibración de básculas de cocina",
            "description": "Verificar exactitud de básculas con pesas de referencia certificadas y registrar resultado.",
        },
        {
            "title"      : "Revisión de stock de material de empaque",
            "description": "Inventariar bolsas, cajas y contenedores para evitar quiebres de stock en hora pico.",
        },
    ],
    "RH": [
        {
            "title"      : "Inducción a nuevo colaborador",
            "description": "Presentar al nuevo integrante el manual de operaciones, políticas y equipo de trabajo.",
        },
        {
            "title"      : "Evaluación de desempeño trimestral",
            "description": "Aplicar formato de evaluación 360° y documentar resultados en expediente del colaborador.",
        },
        {
            "title"      : "Actualización de expediente de colaborador",
            "description": "Verificar y actualizar documentos oficiales, IMSS y datos personales en el sistema.",
        },
        {
            "title"      : "Programación de turnos para semana siguiente",
            "description": "Publicar rol de turnos considerando vacaciones, permisos y cargas de trabajo proyectadas.",
        },
        {
            "title"      : "Entrevista de satisfacción laboral",
            "description": "Aplicar encuesta de clima organizacional y registrar respuestas anonimizadas en METRIX.",
        },
        {
            "title"      : "Trámite de alta ante IMSS",
            "description": "Registrar a nuevo colaborador en IMSS dentro de las 24h de inicio de labores.",
        },
        {
            "title"      : "Reporte de asistencia mensual al corporativo",
            "description": "Consolidar registros de asistencia y enviar reporte al corporativo antes del día 3 del mes.",
        },
        {
            "title"      : "Gestión de solicitudes de vacaciones",
            "description": "Procesar y aprobar solicitudes de vacaciones y permisos en el sistema de RH.",
        },
        {
            "title"      : "Capacitación en reglamento interno",
            "description": "Impartir sesión sobre políticas de la empresa y obtener firma de aceptación del colaborador.",
        },
    ],
    "CAPACITACION": [
        {
            "title"      : "Capacitación en manejo de alérgenos",
            "description": "Taller teórico-práctico sobre identificación y prevención de contaminación cruzada en cocina.",
        },
        {
            "title"      : "Certificación en manipulación de alimentos",
            "description": "Aplicar examen de certificación oficial y registrar resultado aprobado/reprobado en expediente.",
        },
        {
            "title"      : "Entrenamiento en sistema POS",
            "description": "Práctica guiada de operación del sistema de punto de venta con casos de uso reales.",
        },
        {
            "title"      : "Capacitación en protocolo de emergencias",
            "description": "Simulacro de evacuación y uso de extintores según plan de protección civil de la sucursal.",
        },
        {
            "title"      : "Taller de atención al cliente de alto desempeño",
            "description": "Role-playing de situaciones difíciles y técnicas de recuperación de experiencia de cliente.",
        },
        {
            "title"      : "Certificación en uso de equipo de seguridad",
            "description": "Entrenamiento en EPP, manejo de químicos y primeros auxilios básicos para cocina.",
        },
        {
            "title"      : "Actualización en normativa sanitaria NOM-251",
            "description": "Revisión de cambios en la norma y ajuste de procedimientos internos de limpieza e higiene.",
        },
        {
            "title"      : "Entrenamiento en cocina de temporada",
            "description": "Práctica de preparación de platillos del menú especial de temporada antes de su lanzamiento.",
        },
    ],
}

# Comentarios de fallo realistas para tareas FAILED
FAIL_COMMENTS: list[str] = [
    "No se completó por falta de insumos en almacén — se levantó solicitud de compra urgente.",
    "Colaborador ausente sin aviso previo — tarea no iniciada, se reasignará al siguiente turno.",
    "Equipo fuera de servicio — se requiere mantenimiento correctivo antes de reiniciar.",
    "Tiempo insuficiente para completar el procedimiento completo durante el turno.",
    "Falta de capacitación del responsable asignado — se programa refuerzo de formación.",
    "Tarea interrumpida por contingencia operativa (servicio a cliente prioritario).",
    "Materiales recibidos fuera de especificación — rechazados y devueltos a proveedor.",
    "Error en registro de temperatura — datos fuera de rango aceptable (>5°C), se reporta a GER.",
    "Falla en el sistema POS — no fue posible completar el arqueo de caja.",
    "Insumos caducados detectados — proceso detenido por protocolo de inocuidad.",
]

# ── Utilidades de fecha ───────────────────────────────────────────────────────

def _utc() -> datetime:
    return datetime.now(timezone.utc)

def _rand_past(max_days: float = 30.0, min_days: float = 0.0) -> datetime:
    """Datetime UTC aleatorio entre [now - max_days, now - min_days]."""
    min_secs = min_days * 86_400
    max_secs = max_days * 86_400
    offset   = random.uniform(min_secs, max_secs)
    return _utc() - timedelta(seconds=offset)

# ── Constructor del documento Task ────────────────────────────────────────────

def _build_task(
    *,
    user_id:      str,
    store_id:     str,
    created_by:   str,
    position:     str,
    all_user_ids: list[str],
) -> dict[str, Any]:
    """
    Devuelve un dict que replica exactamente el documento MongoDB serializado
    por Spring Data a partir de Task.java + Execution.java + StatusTransition.java.

    Nombres de campo == @Field("...") en los modelos Java.
    Transiciones == camelCase (StatusTransition.java no tiene @Field).
    """
    # ── Definición ──────────────────────────────────────────────────────────
    category    = random.choice(CATEGORIES)
    entry       = random.choice(TASK_CATALOG[category])
    is_critical = random.random() < 0.15   # 15% tareas estratégicas

    # ── Temporalidad base ────────────────────────────────────────────────────
    created_at = _rand_past(max_days=30, min_days=0.5)
    # due_at entre 2 y 48 horas después de created_at (ventana operativa real)
    due_at     = created_at + timedelta(hours=random.uniform(2, 48))

    # ── Estado (distribución solicitada) ─────────────────────────────────────
    roll = random.random()
    if roll < 0.20:
        status = "PENDING"
    elif roll < 0.80:
        status = "COMPLETED"
    else:
        status = "FAILED"

    # ── Defaults ─────────────────────────────────────────────────────────────
    started_at     = None
    finished_at    = None
    on_time        = None
    rework_count   = 0
    quality_rating = None
    comments       = None
    transitions    : list[dict] = []

    # ── Lógica por estado ─────────────────────────────────────────────────────
    if status == "PENDING":
        # ~40% de PENDINGs tienen due_at en el futuro (tareas nuevas)
        if random.random() < 0.40:
            due_at = _utc() + timedelta(hours=random.uniform(1, 72))
        # El resto tiene due_at pasado (tareas overdue — activan alertas Sprint 16)

    elif status == "COMPLETED":
        # started_at: entre 5 y 120 min después de created_at
        started_at = created_at + timedelta(minutes=random.uniform(5, 120))

        on_time_flag = random.random() < 0.72   # 72 % completadas a tiempo

        if on_time_flag:
            # finished_at ≤ due_at  →  on_time = True
            latest_finish = due_at
            earliest_fin  = started_at + timedelta(minutes=10)
            if latest_finish > earliest_fin:
                window = (latest_finish - earliest_fin).total_seconds()
                finished_at = earliest_fin + timedelta(seconds=random.uniform(0, window))
            else:
                # due_at muy cercano al started_at → adelantamos due_at
                finished_at = started_at + timedelta(minutes=random.uniform(15, 90))
                due_at      = finished_at + timedelta(minutes=random.uniform(5, 30))
            on_time = True
        else:
            # finished_at > due_at  →  on_time = False  (llegó tarde)
            finished_at = due_at + timedelta(minutes=random.uniform(10, 120))
            on_time     = False

        # 15% de completadas tuvieron retrabajo previo
        if random.random() < 0.15:
            rework_count = random.randint(1, 2)

        # Calidad correlacionada con puntualidad
        quality_rating = round(
            random.uniform(3.5, 5.0) if on_time else random.uniform(2.0, 4.0), 1
        )

        # Historial de transiciones
        changer = random.choice(all_user_ids)
        if rework_count == 0:
            transitions = [
                _transition("PENDING",     "IN_PROGRESS", started_at,  changer),
                _transition("IN_PROGRESS", "COMPLETED",   finished_at, changer),
            ]
        else:
            # Ciclo de retrabajo: falló y se reabrió antes de completar
            fail_t   = started_at + timedelta(minutes=random.uniform(10, 40))
            reopen_t = fail_t    + timedelta(hours=random.uniform(0.5, 2))
            restart  = reopen_t  + timedelta(minutes=random.uniform(5, 30))
            transitions = [
                _transition("PENDING",     "IN_PROGRESS", started_at, changer),
                _transition("IN_PROGRESS", "FAILED",      fail_t,     changer),
                _transition("FAILED",      "PENDING",     reopen_t,   changer),
                _transition("PENDING",     "IN_PROGRESS", restart,    changer),
                _transition("IN_PROGRESS", "COMPLETED",   finished_at, changer),
            ]

    elif status == "FAILED":
        started_at  = created_at + timedelta(minutes=random.uniform(5, 60))
        finished_at = started_at  + timedelta(minutes=random.uniform(15, 180))
        on_time     = False
        rework_count = random.randint(0, 3)
        comments    = random.choice(FAIL_COMMENTS)

        changer = random.choice(all_user_ids)
        transitions = [
            _transition("PENDING",     "IN_PROGRESS", started_at,  changer),
            _transition("IN_PROGRESS", "FAILED",      finished_at, changer),
        ]

    # Timestamp de última modificación
    updated_at = finished_at or started_at or created_at

    # ── Documento final (campo → @Field("...") del modelo Java) ─────────────
    return {
        # task_definition
        "title"           : entry["title"],
        "description"     : entry["description"],
        "category"        : category,
        "is_critical"     : is_critical,

        # assignment
        "assigned_user_id": user_id,
        "position"        : position,
        "store_id"        : store_id,
        "shift"           : random.choice(SHIFTS),
        "due_at"          : due_at,

        # execution (sub-documento Execution.java)
        "execution": {
            "status"     : status,
            "started_at" : started_at,
            "finished_at": finished_at,
            "on_time"    : on_time,
            "evidence"   : {"images": [], "videos": []},
        },

        # audit
        "rework_count"  : rework_count,
        "quality_rating": quality_rating,
        "comments"      : comments,

        # meta
        "activo"     : True,
        "created_by" : created_by,
        "transitions": transitions,    # List[StatusTransition] camelCase
        "created_at" : created_at,
        "updated_at" : updated_at,
    }


def _transition(
    from_s: str, to_s: str, changed_at: datetime, changed_by: str
) -> dict[str, Any]:
    """StatusTransition.java serializado — camelCase (sin @Field en el modelo)."""
    return {
        "fromStatus": from_s,
        "toStatus"  : to_s,
        "changedAt" : changed_at,
        "changedBy" : changed_by,
    }


# ── Seeder principal ──────────────────────────────────────────────────────────

async def seed(total: int = 75, clear: bool = True) -> None:
    client = AsyncIOMotorClient(MONGODB_URL)
    db     = client[MONGODB_DB_NAME]

    sep = "═" * 58

    try:
        print(f"\n{sep}")
        print(f"  METRIX Seed Data  ·  {total} tareas  →  {MONGODB_DB_NAME}")
        print(f"{sep}\n")

        # ── 1. Cargar usuarios reales ────────────────────────────────────────
        users = await db["users"].find(
            {},
            {"_id": 1, "numeroUsuario": 1, "roles": 1, "storeId": 1},
        ).to_list(500)

        if not users:
            _abort(
                "No se encontraron usuarios en metrix_db.users.\n"
                "  → Levanta el backend Java y registra los usuarios de prueba primero:\n"
                "     cd backend-api && mvn spring-boot:run"
            )

        print(f"  ✓ {len(users)} usuarios cargados desde metrix_db.users")
        for u in users:
            uid   = str(u["_id"])
            roles = ", ".join(u.get("roles", []))
            print(f"    · {uid[:12]}…  {u.get('numeroUsuario', '?'):<10s}  [{roles}]")

        # ── 2. Cargar sucursales reales ──────────────────────────────────────
        stores = await db["stores"].find(
            {"activo": True},
            {"_id": 1, "nombre": 1},
        ).to_list(100)

        if not stores:
            _abort(
                "No se encontraron sucursales activas en metrix_db.stores.\n"
                "  → Crea al menos una sucursal desde el módulo Configuración del frontend."
            )

        print(f"\n  ✓ {len(stores)} sucursales cargadas desde metrix_db.stores")
        for s in stores:
            print(f"    · {str(s['_id'])[:12]}…  {s.get('nombre', 'Sin nombre')}")

        # ── 3. Limpiar colección tasks ───────────────────────────────────────
        print()
        if clear:
            deleted = await db["tasks"].delete_many({})
            print(f"  🗑  Colección tasks vaciada — {deleted.deleted_count} documentos eliminados.")
        else:
            existing = await db["tasks"].count_documents({})
            print(f"  ℹ  Modo append — {existing} tareas existentes conservadas.")

        # ── 4. Preparar referencias cruzadas ────────────────────────────────
        user_ids   = [str(u["_id"]) for u in users]
        store_ids  = [str(s["_id"]) for s in stores]
        admin_ids  = [
            str(u["_id"]) for u in users
            if "ADMIN" in u.get("roles", [])
        ]
        created_bys = admin_ids if admin_ids else user_ids  # fallback

        # ── 5. Generar documentos ────────────────────────────────────────────
        print(f"\n  ⚙  Generando {total} tareas (seed={SEED})…")
        tasks: list[dict] = []
        for _ in range(total):
            tasks.append(
                _build_task(
                    user_id      = random.choice(user_ids),
                    store_id     = random.choice(store_ids),
                    created_by   = random.choice(created_bys),
                    position     = random.choice(POSITIONS),
                    all_user_ids = user_ids,
                )
            )

        # ── 6. Insertar en batch ─────────────────────────────────────────────
        result = await db["tasks"].insert_many(tasks)

        # ── 7. Estadísticas finales ──────────────────────────────────────────
        by_status: dict[str, int] = {}
        on_time_t  = 0
        on_time_f  = 0
        critical_n = 0

        for t in tasks:
            st = t["execution"]["status"]
            by_status[st] = by_status.get(st, 0) + 1
            ot = t["execution"]["on_time"]
            if ot is True:
                on_time_t += 1
            elif ot is False:
                on_time_f += 1
            if t["is_critical"]:
                critical_n += 1

        inserted = len(result.inserted_ids)

        print(f"\n  ✅ {inserted} tareas insertadas exitosamente\n")
        print(f"  {'Estado':<14s}  {'Cant':>4s}  {'Distribución'}")
        print(f"  {'─'*48}")

        total_w = max(by_status.values()) if by_status else 1
        for st in ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]:
            cnt = by_status.get(st, 0)
            if cnt == 0:
                continue
            bar  = "█" * round(cnt / total_w * 30)
            pct  = cnt / inserted * 100
            print(f"  {st:<14s}  {cnt:>4d}  {bar}  ({pct:.0f}%)")

        print(f"\n  On-time ✓  : {on_time_t:>3d} tareas")
        print(f"  Fuera tiempo: {on_time_f:>3d} tareas")
        print(f"  Críticas    : {critical_n:>3d} tareas  (KPI #8)")
        print(f"  Sucursales  : {len(store_ids)}")
        print(f"  Usuarios    : {len(user_ids)}")

        print(f"\n  👉 Verifica la integración:")
        print(f"     GET http://localhost:8001/api/v1/analytics/test-kpi")
        print(f"     GET http://localhost:8001/docs  (Swagger UI)")
        print(f"\n{sep}\n")

    except Exception as exc:
        print(f"\n  ❌ Error durante el seeding: {exc}\n", file=sys.stderr)
        raise

    finally:
        client.close()


# ── CLI ───────────────────────────────────────────────────────────────────────

def _abort(msg: str) -> None:
    print(f"\n  ⚠️  {msg}\n", file=sys.stderr)
    sys.exit(1)


def _parse() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="METRIX Seed Data — genera tareas de prueba en MongoDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Ejemplos:\n"
            "  python seed_data.py\n"
            "  python seed_data.py --count 200\n"
            "  python seed_data.py --append --count 50\n"
        ),
    )
    p.add_argument(
        "--count", "-n",
        type=int, default=75,
        metavar="N",
        help="Número de tareas a generar (default: 75)",
    )
    p.add_argument(
        "--append", "-a",
        action="store_true",
        help="Agrega tareas sin vaciar la colección existente",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse()
    asyncio.run(seed(total=args.count, clear=not args.append))
