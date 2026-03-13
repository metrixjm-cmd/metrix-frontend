#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# METRIX — Script de despliegue en Google Cloud (sin VMs)
#
# Servicios desplegados:
#   1. Analytics  → Cloud Run  (FastAPI)
#   2. Backend    → Cloud Run  (Spring Boot)
#   3. Frontend   → Firebase Hosting (Angular)
#
# Pre-requisitos:
#   - gcloud CLI instalado y autenticado  (gcloud auth login)
#   - firebase CLI instalado              (npm install -g firebase-tools)
#   - Node 22 instalado para el build Angular
#   - Maven 3.9+ con Java 21 (solo si buildeas localmente; Cloud Build no lo requiere)
#
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuración — edita estos valores antes del primer deploy ──────────────
PROJECT_ID="${GCP_PROJECT_ID:?ERROR: Variable GCP_PROJECT_ID no definida}"
REGION="${GCP_REGION:-us-central1}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/metrix"

# Secretos — NUNCA hardcodear. Leer de Secret Manager o variables de entorno.
MONGO_URI="${MONGO_URI:?ERROR: Variable MONGO_URI no definida}"
JWT_SECRET="${METRIX_SECURITY_JWT_SECRET_KEY:?ERROR: Variable METRIX_SECURITY_JWT_SECRET_KEY no definida}"

ANALYTICS_SERVICE="metrix-analytics"
BACKEND_SERVICE="metrix-backend"
FIREBASE_PROJECT="${PROJECT_ID}"
# ─────────────────────────────────────────────────────────────────────────────

echo "▶ Proyecto GCP: ${PROJECT_ID} | Región: ${REGION}"
gcloud config set project "${PROJECT_ID}"

# ── Habilitar APIs necesarias (idempotente) ───────────────────────────────────
echo "▶ Habilitando APIs GCP..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --quiet

# ── Crear Artifact Registry repo (idempotente) ────────────────────────────────
if ! gcloud artifacts repositories describe metrix --location="${REGION}" &>/dev/null; then
  echo "▶ Creando repositorio Artifact Registry..."
  gcloud artifacts repositories create metrix \
    --repository-format=docker \
    --location="${REGION}" \
    --description="METRIX Docker images"
fi

# ── Autenticar Docker con Artifact Registry ───────────────────────────────────
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── 1. ANALYTICS — Build + Push + Deploy ────────────────────────────────────
echo ""
echo "━━━ [1/3] Analytics Service ━━━"
docker build -t "${REGISTRY}/analytics:latest" ./analytics-service
docker push "${REGISTRY}/analytics:latest"

gcloud run deploy "${ANALYTICS_SERVICE}" \
  --image="${REGISTRY}/analytics:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --set-env-vars="MONGO_URI=${MONGO_URI}" \
  --quiet

ANALYTICS_URL=$(gcloud run services describe "${ANALYTICS_SERVICE}" \
  --region="${REGION}" \
  --format="value(status.url)")
echo "✓ Analytics URL: ${ANALYTICS_URL}"

# ── 2. BACKEND — Build + Push + Deploy ──────────────────────────────────────
echo ""
echo "━━━ [2/3] Backend (Spring Boot) ━━━"
docker build -t "${REGISTRY}/backend:latest" ./backend-api
docker push "${REGISTRY}/backend:latest"

# Primera vez: desplegamos sin CORS_ALLOWED_ORIGINS (lo actualizamos después del frontend)
gcloud run deploy "${BACKEND_SERVICE}" \
  --image="${REGISTRY}/backend:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="SPRING_DATA_MONGODB_URI=${MONGO_URI},METRIX_SECURITY_JWT_SECRET_KEY=${JWT_SECRET},METRIX_ANALYTICS_URL=${ANALYTICS_URL}/api/v1/analytics,CORS_ALLOWED_ORIGINS=http://localhost:4200,SPRING_PROFILES_ACTIVE=docker" \
  --quiet

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --format="value(status.url)")
echo "✓ Backend URL: ${BACKEND_URL}"

# ── 3. FRONTEND — Build Angular + Deploy Firebase ───────────────────────────
echo ""
echo "━━━ [3/3] Frontend (Angular → Firebase Hosting) ━━━"

# Inyectar URL del backend en environment.prod.ts
sed -i "s|REPLACE_WITH_BACKEND_URL|${BACKEND_URL}|g" \
  frontend-web/src/environments/environment.prod.ts

# Build Angular production
cd frontend-web
npm ci --silent
npx ng build --configuration=production
cd ..

# Deploy Firebase Hosting
firebase use "${FIREBASE_PROJECT}"
firebase deploy --only hosting --project "${FIREBASE_PROJECT}"

# Obtener URL de Firebase Hosting
FIREBASE_URL="https://${FIREBASE_PROJECT}.web.app"
echo "✓ Firebase URL: ${FIREBASE_URL}"

# ── 4. Actualizar CORS en backend con URL real del frontend ──────────────────
echo ""
echo "━━━ [4/4] Actualizando CORS en Backend ━━━"
gcloud run services update "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --update-env-vars="CORS_ALLOWED_ORIGINS=${FIREBASE_URL},https://${FIREBASE_PROJECT}.firebaseapp.com" \
  --quiet

# ── Restaurar environment.prod.ts (no persistir URL hardcodeada en git) ──────
sed -i "s|${BACKEND_URL}|REPLACE_WITH_BACKEND_URL|g" \
  frontend-web/src/environments/environment.prod.ts

echo ""
echo "════════════════════════════════════════════"
echo "✅ METRIX desplegado correctamente"
echo "   Frontend : ${FIREBASE_URL}"
echo "   Backend  : ${BACKEND_URL}"
echo "   Analytics: ${ANALYTICS_URL}"
echo "════════════════════════════════════════════"
