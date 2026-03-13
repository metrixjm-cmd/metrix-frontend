package com.metrix.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

/**
 * Configuración de Redis para Pub/Sub y operaciones de bajo nivel.
 * Solo se activa cuando {@code metrix.redis.enabled=true}.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(name = "metrix.redis.enabled", havingValue = "true")
public class RedisConfig {

    public static final String METRICS_CHANNEL = "metrix.events";
    public static final String SSE_CHANNEL     = "sse.broadcast";

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }

    @Bean
    public ChannelTopic metricsChannel() {
        return new ChannelTopic(METRICS_CHANNEL);
    }

    @Bean
    public ChannelTopic sseChannel() {
        return new ChannelTopic(SSE_CHANNEL);
    }

    @Bean
    public ObjectMapper redisObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }

    /**
     * Container que escucha los channels de Redis.
     * El SSE subscriber se registra aquí para recibir notificaciones
     * publicadas por otras instancias de Cloud Run.
     */
    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory factory,
            MessageListenerAdapter sseListenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.addMessageListener(sseListenerAdapter, new ChannelTopic(SSE_CHANNEL));
        log.info("[RedisConfig] Listener registrado en channel: {}", SSE_CHANNEL);
        return container;
    }

    @Bean
    public MessageListenerAdapter sseListenerAdapter(RedisSSESubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "onMessage");
    }
}
