#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# METRIX — Deploy a Google Cloud (sin VMs, sin Redis)
#
# Arquitectura cost-optimized:
#   Backend   → Cloud Run (1 instancia, 512Mi, Caffeine cache)
#   Analytics → Cloud Run (1 instancia, 256Mi)
#   Frontend  → Firebase Hosting (CDN global, $0 hasta 10GB/mes)
#   Database  → MongoDB Atlas Free Tier (512MB) o M10 ($57/mes)
#   Redis     → NO necesario (single-instance mode)
#
# Costo estimado: $0-10/mes (free tier) → ~$60/mes (con Atlas M10)
#
# Pre-requisitos:
#   - gcloud CLI autenticado  (gcloud auth login)
#   - firebase CLI             (npm install -g firebase-tools)
#   - Docker instalado
#
# Variables requeridas:
#   GCP_PROJECT_ID, MONGO_URI, METRIX_SECURITY_JWT_SECRET_KEY
#
# Uso:
#   chmod +x deploy.sh && ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Variables requeridas ─────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?ERROR: Variable GCP_PROJECT_ID no definida}"
REGION="${GCP_REGION:-us-central1}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/metrix"

MONGO_URI="${MONGO_URI:?ERROR: Variable MONGO_URI no definida}"
JWT_SECRET="${METRIX_SECURITY_JWT_SECRET_KEY:?ERROR: Variable METRIX_SECURITY_JWT_SECRET_KEY no definida}"
API_KEY="${METRIX_API_KEY:-prod-$(openssl rand -hex 8)}"

ANALYTICS_SERVICE="metrix-analytics"
BACKEND_SERVICE="metrix-backend"
FIREBASE_PROJECT="${PROJECT_ID}"

echo "▶ Proyecto: ${PROJECT_ID} | Región: ${REGION}"
echo "▶ Modo: single-instance (zero-Redis, Caffeine cache)"
echo ""
gcloud config set project "${PROJECT_ID}"

# ── Habilitar APIs ──────────────────────────────────────────────────────────
echo "▶ Habilitando APIs GCP..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

# ── Artifact Registry ───────────────────────────────────────────────────────
if ! gcloud artifacts repositories describe metrix --location="${REGION}" &>/dev/null; then
  echo "▶ Creando repositorio Artifact Registry..."
  gcloud artifacts repositories create metrix \
    --repository-format=docker \
    --location="${REGION}" \
    --description="METRIX Docker images"
fi
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── 1/3 ANALYTICS ───────────────────────────────────────────────────────────
echo ""
echo "━━━ [1/3] Analytics Service (FastAPI) ━━━"
docker build -t "${REGISTRY}/analytics:latest" ./analytics-service
docker push "${REGISTRY}/analytics:latest"

gcloud run deploy "${ANALYTICS_SERVICE}" \
  --image="${REGISTRY}/analytics:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --concurrency=80 \
  --timeout=60 \
  --set-env-vars="MONGO_URI=${MONGO_URI},METRIX_API_KEY=${API_KEY}" \
  --quiet

ANALYTICS_URL=$(gcloud run services describe "${ANALYTICS_SERVICE}" \
  --region="${REGION}" \
  --format="value(status.url)")
echo "✓ Analytics: ${ANALYTICS_URL}"

# ── 2/3 BACKEND ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [2/3] Backend (Spring Boot — single instance, Caffeine cache) ━━━"
docker build -t "${REGISTRY}/backend:latest" ./backend-api
docker push "${REGISTRY}/backend:latest"

gcloud run deploy "${BACKEND_SERVICE}" \
  --image="${REGISTRY}/backend:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=1 \
  --concurrency=80 \
  --timeout=300 \
  --set-env-vars="SPRING_DATA_MONGODB_URI=${MONGO_URI},METRIX_SECURITY_JWT_SECRET_KEY=${JWT_SECRET},METRIX_ANALYTICS_URL=${ANALYTICS_URL}/api/v1/analytics,METRIX_API_KEY=${API_KEY},CORS_ALLOWED_ORIGINS=http://localhost:4200,SPRING_PROFILES_ACTIVE=docker" \
  --quiet

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(status.url)")
echo "✓ Backend: ${BACKEND_URL}"

# ── 3/3 FRONTEND ────────────────────────────────────────────────────────────
echo ""
echo "━━━ [3/3] Frontend (Angular → Firebase Hosting) ━━━"

# Inyectar URL del backend
sed -i "s|REPLACE_WITH_BACKEND_URL|${BACKEND_URL}|g" \
  frontend-web/src/environments/environment.prod.ts

cd frontend-web
npm ci --silent
npx ng build --configuration=production
cd ..

firebase use "${FIREBASE_PROJECT}"
firebase deploy --only hosting --project "${FIREBASE_PROJECT}"

FIREBASE_URL="https://${FIREBASE_PROJECT}.web.app"
echo "✓ Frontend: ${FIREBASE_URL}"

# ── Actualizar CORS con URL real ─────────────────────────────────────────────
echo ""
echo "━━━ Actualizando CORS ━━━"
gcloud run services update "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --update-env-vars="CORS_ALLOWED_ORIGINS=${FIREBASE_URL},https://${FIREBASE_PROJECT}.firebaseapp.com" \
  --quiet

# Restaurar environment.prod.ts
sed -i "s|${BACKEND_URL}|REPLACE_WITH_BACKEND_URL|g" \
  frontend-web/src/environments/environment.prod.ts

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ METRIX desplegado — modo single-instance (zero Redis)"
echo ""
echo "   Frontend : ${FIREBASE_URL}"
echo "   Backend  : ${BACKEND_URL}"
echo "   Analytics: ${ANALYTICS_URL}"
echo ""
echo "   Cache    : Caffeine (in-memory, $0/mes)"
echo "   Rate Limit: local (per-instance, $0/mes)"
echo "   SSE      : local delivery (single-instance)"
echo "════════════════════════════════════════════════════════"
