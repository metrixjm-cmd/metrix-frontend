package com.metrix.api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SubmitExamRequest {

    /** Un índice por pregunta (mismo orden que exam.questions). */
    @NotNull
    private List<Integer> answers;

    /** Tiempo empleado en segundos. Opcional. */
    private Integer timeTakenSeconds;
}
