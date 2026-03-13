package com.metrix.api.dto;

import com.metrix.api.model.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Vista del examen para el colaborador que lo va a responder.
 * No incluye {@code correctOptionIndex} para no revelar las respuestas.
 */
@Data
@Builder
public class ExamForTakeResponse {

    private String id;
    private String title;
    private String description;
    private int passingScore;
    private Integer timeLimitMinutes;
    private int questionCount;
    private List<QuestionForTake> questions;

    @Data
    @Builder
    public static class QuestionForTake {
        private String id;
        private String questionText;
        private QuestionType type;
        private List<String> options;
        private int points;
    }
}
