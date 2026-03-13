package com.metrix.api.service;

import com.metrix.api.dto.CreateIncidentRequest;
import com.metrix.api.dto.IncidentResponse;
import com.metrix.api.dto.NotificationEvent;
import com.metrix.api.dto.UpdateIncidentStatusRequest;
import com.metrix.api.exception.ResourceNotFoundException;
import com.metrix.api.model.*;
import com.metrix.api.repository.IncidentRepository;
import com.metrix.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Motor de incidencias operativas para METRIX (Sprint 15).
 * <p>
 * Cubre el Objetivo #20 — Gestión de Contingencias.
 * <p>
 * Ciclo de vida: ABIERTA → EN_RESOLUCION → CERRADA (re-apertura: CERRADA → ABIERTA).
 * Las incidencias CRITICA disparan SSE inmediato a los gerentes de la sucursal.
 */
@Service
@RequiredArgsConstructor
public class IncidentServiceImpl implements IncidentService {

    private final IncidentRepository  incidentRepository;
    private final UserRepository      userRepository;
    private final NotificationService notificationService;
    private final GcsService          gcsService;

    // ── Crear ────────────────────────────────────────────────────────────────

    @Override
    public IncidentResponse create(CreateIncidentRequest request, String reporterNumeroUsuario) {
        User reporter = userRepository.findByNumeroUsuario(reporterNumeroUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario reportador no encontrado: " + reporterNumeroUsuario));

        Incident incident = Incident.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .severity(request.getSeverity())
                .taskId(request.getTaskId())
                .reporterUserId(reporter.getId())
                .reporterName(reporter.getNombre())
                .reporterPosition(reporter.getPuesto())
                .storeId(request.getStoreId())
                .shift(request.getShift())
                .implicados(request.getImplicados() != null
                        ? new ArrayList<>(request.getImplicados())
                        : new ArrayList<>())
                .followUpResponsible(request.getFollowUpResponsible())
                .build();

        Incident saved = incidentRepository.save(incident);

        // Notificar a los gerentes/admin de la sucursal
        String severity = saved.getSeverity() == IncidentSeverity.CRITICA ? "critical" : "warning";
        String title    = saved.getSeverity() == IncidentSeverity.CRITICA
                ? "Incidencia CRÍTICA reportada"
                : "Nueva incidencia reportada";

        notificationService.sendToStoreManagers(saved.getStoreId(), NotificationEvent.builder()
                .id(UUID.randomUUID().toString())
                .type("INCIDENT_CREATED")
                .severity(severity)
                .title(title)
                .body(saved.getTitle() + " · " + saved.getReporterName() + " · " + saved.getShift())
                .storeId(saved.getStoreId())
                .timestamp(Instant.now())
                .build());

        return toResponse(saved);
    }

    // ── Consultas ────────────────────────────────────────────────────────────

    @Override
    public List<IncidentResponse> getMyIncidents(String reporterNumeroUsuario) {
        User reporter = userRepository.findByNumeroUsuario(reporterNumeroUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuario no encontrado: " + reporterNumeroUsuario));
        return incidentRepository.findByReporterUserIdAndActivoTrue(reporter.getId())
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<IncidentResponse> getByStore(String storeId) {
        return incidentRepository.findByStoreIdAndActivoTrue(storeId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<IncidentResponse> getByStoreAndStatus(String storeId, IncidentStatus status) {
        return incidentRepository.findByStoreIdAndStatusAndActivoTrue(storeId, status)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public IncidentResponse getById(String incidentId) {
        return incidentRepository.findById(incidentId)
                .filter(Incident::isActivo)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Incidencia no encontrada: " + incidentId));
    }

    // ── Cambio de Estado ─────────────────────────────────────────────────────

    @Override
    public IncidentResponse updateStatus(String incidentId, UpdateIncidentStatusRequest request,
                                          String currentNumeroUsuario) {
        Incident incident = incidentRepository.findById(incidentId)
                .filter(Incident::isActivo)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Incidencia no encontrada: " + incidentId));

        IncidentStatus current = incident.getStatus();
        IncidentStatus next    = request.getNewStatus();

        validateTransition(current, next);

        Instant now = Instant.now();

        switch (next) {
            case EN_RESOLUCION -> applyInResolution(incident);
            case CERRADA       -> applyClosed(incident, now, request.getResolutionNotes(),
                                             request.getClosedByName(), currentNumeroUsuario);
            case ABIERTA       -> applyReopened(incident);
        }

        incident.getTransitions().add(IncidentTransition.builder()
                .fromStatus(current)
                .toStatus(next)
                .changedAt(now)
                .changedBy(currentNumeroUsuario)
                .notes(request.getNotes())
                .build());

        Incident saved = incidentRepository.save(incident);
        emitStatusNotification(saved, next);
        return toResponse(saved);
    }

    // ── Lógica de Transiciones ────────────────────────────────────────────────

    private void validateTransition(IncidentStatus current, IncidentStatus next) {
        boolean valid = switch (current) {
            case ABIERTA       -> next == IncidentStatus.EN_RESOLUCION;
            case EN_RESOLUCION -> next == IncidentStatus.CERRADA;
            case CERRADA       -> next == IncidentStatus.ABIERTA;
        };

        if (!valid) {
            throw new IllegalStateException(String.format(
                    "Transición inválida: %s → %s. " +
                    "Flujo permitido: ABIERTA→EN_RESOLUCION, EN_RESOLUCION→CERRADA, CERRADA→ABIERTA.",
                    current, next));
        }
    }

    private void applyInResolution(Incident incident) {
        incident.setStatus(IncidentStatus.EN_RESOLUCION);
    }

    private void applyClosed(Incident incident, Instant now, String resolutionNotes,
                              String closedByNameOverride, String resolvedBy) {
        if (resolutionNotes == null || resolutionNotes.isBlank()) {
            throw new IllegalStateException(
                    "Al cerrar una incidencia debe proporcionar 'resolutionNotes' con el detalle de la resolución.");
        }
        // Si el front envía un nombre explícito, usarlo. Si no, obtenerlo del usuario autenticado.
        String closerName;
        String closerNumero;
        if (closedByNameOverride != null && !closedByNameOverride.isBlank()) {
            closerName   = closedByNameOverride.trim();
            closerNumero = resolvedBy;
        } else {
            User closer = userRepository.findByNumeroUsuario(resolvedBy).orElse(null);
            closerName   = closer != null ? closer.getNombre()        : resolvedBy;
            closerNumero = closer != null ? closer.getNumeroUsuario() : resolvedBy;
        }

        incident.setStatus(IncidentStatus.CERRADA);
        incident.setResolutionNotes(resolutionNotes);
        incident.setResolvedByUserId(resolvedBy);
        incident.setClosedByName(closerName);
        incident.setClosedByNumero(closerNumero);
        incident.setResolvedAt(now);
    }

    private void applyReopened(Incident incident) {
        incident.setStatus(IncidentStatus.ABIERTA);
        incident.setResolvedAt(null);
        incident.setResolvedByUserId(null);
        incident.setClosedByName(null);
        incident.setClosedByNumero(null);
        incident.setResolutionNotes(null);
    }

    // ── Notificaciones ────────────────────────────────────────────────────────

    private void emitStatusNotification(Incident incident, IncidentStatus newStatus) {
        switch (newStatus) {
            case EN_RESOLUCION ->
                notificationService.sendToUser(incident.getReporterUserId(), NotificationEvent.builder()
                        .id(UUID.randomUUID().toString())
                        .type("INCIDENT_IN_RESOLUTION")
                        .severity("info")
                        .title("Incidencia en resolución")
                        .body(incident.getTitle() + " ha sido tomada por el equipo.")
                        .storeId(incident.getStoreId())
                        .timestamp(Instant.now())
                        .build());

            case CERRADA ->
                notificationService.sendToUser(incident.getReporterUserId(), NotificationEvent.builder()
                        .id(UUID.randomUUID().toString())
                        .type("INCIDENT_RESOLVED")
                        .severity("info")
                        .title("Incidencia cerrada")
                        .body(incident.getTitle() + " ha sido resuelta: " +
                              incident.getResolutionNotes().substring(
                                  0, Math.min(60, incident.getResolutionNotes().length())))
                        .storeId(incident.getStoreId())
                        .timestamp(Instant.now())
                        .build());

            case ABIERTA ->
                notificationService.sendToStoreManagers(incident.getStoreId(), NotificationEvent.builder()
                        .id(UUID.randomUUID().toString())
                        .type("INCIDENT_REOPENED")
                        .severity("warning")
                        .title("Incidencia reabierta")
                        .body(incident.getTitle() + " ha sido reabierta para nueva revisión.")
                        .storeId(incident.getStoreId())
                        .timestamp(Instant.now())
                        .build());
        }
    }

    // ── Evidencias Multimedia ─────────────────────────────────────────────────

    @Override
    public IncidentResponse uploadEvidence(String incidentId, MultipartFile file,
                                            String currentNumeroUsuario) {
        Incident incident = incidentRepository.findById(incidentId)
                .filter(Incident::isActivo)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Incidencia no encontrada: " + incidentId));

        String contentType = file.getContentType() != null ? file.getContentType() : "";
        String tipo;
        String extension;

        if (contentType.startsWith("image/")) {
            tipo      = "img";
            extension = contentType.equals("image/png") ? "png"
                      : contentType.equals("image/webp") ? "webp" : "jpg";
        } else if (contentType.startsWith("video/")) {
            tipo      = "vid";
            extension = contentType.equals("video/webm") ? "webm" : "mp4";
        } else {
            throw new IllegalArgumentException(
                    "Tipo de archivo no soportado. Se aceptan imágenes (JPG, PNG, WebP) y videos (MP4, WebM).");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Error al leer el archivo de evidencia.", e);
        }

        String url = gcsService.uploadFile(
                incident.getStoreId(), incidentId, tipo, bytes, contentType, extension);

        incident.getEvidenceUrls().add(url);
        return toResponse(incidentRepository.save(incident));
    }

    // ── Mapper ───────────────────────────────────────────────────────────────

    private IncidentResponse toResponse(Incident incident) {
        return IncidentResponse.builder()
                .id(incident.getId())
                .title(incident.getTitle())
                .description(incident.getDescription())
                .category(incident.getCategory())
                .severity(incident.getSeverity())
                .taskId(incident.getTaskId())
                .reporterUserId(incident.getReporterUserId())
                .reporterName(incident.getReporterName())
                .reporterPosition(incident.getReporterPosition())
                .storeId(incident.getStoreId())
                .shift(incident.getShift())
                .implicados(incident.getImplicados())
                .followUpResponsible(incident.getFollowUpResponsible())
                .status(incident.getStatus())
                .resolvedByUserId(incident.getResolvedByUserId())
                .closedByName(incident.getClosedByName())
                .closedByNumero(incident.getClosedByNumero())
                .resolutionNotes(incident.getResolutionNotes())
                .resolvedAt(incident.getResolvedAt())
                .evidenceUrls(incident.getEvidenceUrls())
                .createdAt(incident.getCreatedAt())
                .updatedAt(incident.getUpdatedAt())
                .build();
    }
}
