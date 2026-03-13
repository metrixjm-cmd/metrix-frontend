package com.metrix.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

/**
 * Pregunta embebida dentro de un Exam.
 * Para MULTIPLE_CHOICE: 4 opciones en {@code options}, índice correcto en {@code correctOptionIndex}.
 * Para TRUE_FALSE: options = ["Verdadero", "Falso"], correctOptionIndex = 0 ó 1.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamQuestion {

    @Field("id")
    private String id;

    @Field("question_text")
    private String questionText;

    @Field("type")
    private QuestionType type;

    @Field("options")
    private List<String> options;

    /** Índice (0-based) de la opción correcta en {@code options}. */
    @Field("correct_option_index")
    private int correctOptionIndex;

    @Builder.Default
    @Field("points")
    private int points = 1;
}
