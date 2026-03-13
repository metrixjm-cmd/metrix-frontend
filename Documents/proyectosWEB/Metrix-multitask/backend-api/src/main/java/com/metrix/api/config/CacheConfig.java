package com.metrix.api.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Configuración dual de cache: Redis (primary) + Caffeine (fallback).
 * <p>
 * Si Redis está disponible ({@code metrix.redis.enabled=true}), usa RedisCacheManager
 * para cache distribuido entre instancias Cloud Run.
 * Si no, cae a Caffeine in-memory (dev local sin Redis).
 * <p>
 * Caches:
 * <ul>
 *   <li>{@code kpiSummary} — TTL 5 min</li>
 *   <li>{@code storeRanking} — TTL 5 min</li>
 *   <li>{@code leaderboard} — TTL 10 min</li>
 * </ul>
 */
@Slf4j
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Redis cache manager — activado cuando metrix.redis.enabled=true.
     * Usa serialización JSON para que los datos sean legibles en redis-cli.
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "metrix.redis.enabled", havingValue = "true")
    public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        log.info("[CacheConfig] Redis cache manager activado");

        var jsonSerializer = RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer());

        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeValuesWith(jsonSerializer)
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> perCache = Map.of(
                "kpiSummary",   defaults.entryTtl(Duration.ofMinutes(5)),
                "storeRanking", defaults.entryTtl(Duration.ofMinutes(5)),
                "leaderboard",  defaults.entryTtl(Duration.ofMinutes(10))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(perCache)
                .transactionAware()
                .build();
    }

    /**
     * Caffeine fallback — activado cuando Redis NO está habilitado (dev local).
     */
    @Bean
    @ConditionalOnProperty(name = "metrix.redis.enabled", havingValue = "false", matchIfMissing = true)
    public CacheManager caffeineCacheManager() {
        log.info("[CacheConfig] Caffeine (local) cache manager activado — Redis no disponible");

        CaffeineCacheManager manager = new CaffeineCacheManager(
                "kpiSummary", "storeRanking", "leaderboard");
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .maximumSize(200)
                .recordStats());
        return manager;
    }
}
