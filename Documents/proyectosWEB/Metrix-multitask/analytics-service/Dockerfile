# ── METRIX Analytics Service — Dockerfile para Google Cloud Run ──────────────
#
# Optimizaciones aplicadas:
#   - python:3.12-slim  → imagen base mínima (~120 MB vs ~900 MB full)
#   - --no-cache-dir    → no guarda cache de pip, reduce tamaño de capa
#   - --no-install-recommends (apt) → evita paquetes innecesarios del OS
#   - PYTHONDONTWRITEBYTECODE=1  → elimina archivos .pyc
#   - PYTHONUNBUFFERED=1         → stdout/stderr sin buffer (logs en Cloud Run)
#   - Puerto 8080                → puerto estándar exigido por Cloud Run
#   - Un solo worker uvicorn     → Cloud Run escala instancias, no workers
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

# Metadatos
LABEL maintainer="METRIX Team"
LABEL description="METRIX Analytics Service — FastAPI + motor + pandas"

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /service

# Dependencias del sistema necesarias para numpy/pandas en slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Instala dependencias Python primero (capa cacheada si requirements.txt no cambia)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código de la aplicación
COPY app/ ./app/

# Expone el puerto que Cloud Run espera
EXPOSE 8080

# Uvicorn como servidor ASGI
# --host 0.0.0.0  → acepta conexiones externas dentro del contenedor
# --port 8080     → puerto estándar Cloud Run
# --workers 1     → Cloud Run escala horizontal, no vertical
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
