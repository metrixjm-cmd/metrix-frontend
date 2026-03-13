package com.metrix.api.dto;

import com.metrix.api.model.QuestionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ExamQuestionDto {

    @NotBlank
    private String questionText;

    @NotNull
    private QuestionType type;

    @NotNull
    @Size(min = 2, max = 6)
    private List<String> options;

    /** Índice de la opción correcta. */
    private int correctOptionIndex;

    private int points = 1;
}
