package com.metrix.api.controller;

import com.metrix.api.dto.*;
import com.metrix.api.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para el módulo Trainer (Sprint 19).
 * <p>
 * Endpoints:
 * <ul>
 *   <li>POST   /api/v1/exams            — crear examen (ADMIN/GERENTE)</li>
 *   <li>GET    /api/v1/exams/store/{id} — listar exámenes de una sucursal</li>
 *   <li>GET    /api/v1/exams/{id}       — detalle de examen (con respuestas correctas)</li>
 *   <li>GET    /api/v1/exams/{id}/take  — examen para responder (sin respuestas correctas)</li>
 *   <li>POST   /api/v1/exams/{id}/submit — enviar respuestas</li>
 *   <li>GET    /api/v1/exams/{id}/submissions — historial de submissions (ADMIN/GERENTE)</li>
 *   <li>GET    /api/v1/exams/my-submissions — mis submissions</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    /** Crear examen — solo ADMIN o GERENTE. */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
    public ResponseEntity<ExamResponse> create(
            @Valid @RequestBody CreateExamRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(examService.create(request, auth.getName()));
    }

    /** Listar exámenes de una sucursal. */
    @GetMapping("/store/{storeId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
    public ResponseEntity<List<ExamResponse>> getByStore(@PathVariable String storeId) {
        return ResponseEntity.ok(examService.getByStore(storeId));
    }

    /** Detalle completo (incluye respuestas correctas) — solo ADMIN/GERENTE. */
    @GetMapping("/{examId}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
    public ResponseEntity<ExamResponse> getById(@PathVariable String examId) {
        return ResponseEntity.ok(examService.getById(examId));
    }

    /** Vista del examen para responder — sin respuestas correctas. Cualquier usuario autenticado. */
    @GetMapping("/{examId}/take")
    public ResponseEntity<ExamForTakeResponse> getForTake(@PathVariable String examId) {
        return ResponseEntity.ok(examService.getForTake(examId));
    }

    /** Enviar respuestas y obtener calificación. Cualquier usuario autenticado. */
    @PostMapping("/{examId}/submit")
    public ResponseEntity<ExamSubmissionResponse> submit(
            @PathVariable String examId,
            @Valid @RequestBody SubmitExamRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(examService.submit(examId, request, auth.getName()));
    }

    /** Historial de submissions de un examen — solo ADMIN/GERENTE. */
    @GetMapping("/{examId}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
    public ResponseEntity<List<ExamSubmissionResponse>> getSubmissions(@PathVariable String examId) {
        return ResponseEntity.ok(examService.getSubmissions(examId));
    }

    /** Mis propias submissions. Cualquier usuario autenticado. */
    @GetMapping("/my-submissions")
    public ResponseEntity<List<ExamSubmissionResponse>> getMySubmissions(Authentication auth) {
        return ResponseEntity.ok(examService.getMySubmissions(auth.getName()));
    }
}
