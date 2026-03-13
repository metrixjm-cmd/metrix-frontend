package com.metrix.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Evento de métrica emitido por el MetricsInterceptor.
 * Publicado a Redis Pub/Sub channel "metrix.events" para consumo
 * asíncrono por los Python workers.
 */
@Data
@Builder
public class MetricEvent {
    private String id;
    private String service;
    private String method;
    private long durationMs;
    private String status;       // OK | ERROR
    private String errorMessage;
    private String storeId;
    private String userId;
    private Instant timestamp;
}
