package com.metrix.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Rate limiter distribuido basado en Redis.
 * <p>
 * Limita requests por IP (o por usuario JWT si está autenticado).
 * Usa una sliding window simple con Redis INCR + EXPIRE.
 * <p>
 * Límites:
 * <ul>
 *   <li>GET:  200 requests/min</li>
 *   <li>POST/PATCH/PUT/DELETE: 30 requests/min</li>
 * </ul>
 * Solo se activa cuando {@code metrix.redis.enabled=true}.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "metrix.redis.enabled", havingValue = "true")
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int READ_LIMIT  = 200;  // requests/min
    private static final int WRITE_LIMIT = 30;   // requests/min
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final StringRedisTemplate redisTemplate;

    public RateLimitFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // No limitar health checks ni preflight CORS
        String path = request.getRequestURI();
        if ("/health".equals(path) || "OPTIONS".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientId = resolveClientId(request);
        boolean isWrite = !"GET".equals(request.getMethod()) && !"HEAD".equals(request.getMethod());
        int limit = isWrite ? WRITE_LIMIT : READ_LIMIT;
        String key = "ratelimit:" + (isWrite ? "w:" : "r:") + clientId;

        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, WINDOW);
            }

            if (count != null && count > limit) {
                log.warn("[RateLimit] {} exceeded: {} requests in window (limit {})",
                        clientId, count, limit);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"error\":\"Too many requests\",\"retryAfterSeconds\":60}");
                return;
            }

            // Agregar headers informativos
            response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            response.setHeader("X-RateLimit-Remaining",
                    String.valueOf(Math.max(0, limit - (count != null ? count : 0))));

        } catch (Exception e) {
            // Redis down — no bloquear el request, degradar gracefully
            log.debug("[RateLimit] Redis unavailable, allowing request: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientId(HttpServletRequest request) {
        // Intentar resolver por JWT user principal
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            // Usar un hash simple del token como ID (no decodificar para performance)
            return "user:" + Integer.toHexString(auth.hashCode());
        }
        // Fallback a IP
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            return "ip:" + ip.split(",")[0].trim();
        }
        return "ip:" + request.getRemoteAddr();
    }
}
