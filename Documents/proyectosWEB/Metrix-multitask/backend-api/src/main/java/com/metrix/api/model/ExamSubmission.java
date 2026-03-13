package com.metrix.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.List;

/**
 * Registro de la respuesta de un colaborador a un examen (Sprint 19).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "exam_submissions")
@CompoundIndexes({
        @CompoundIndex(name = "idx_sub_exam",  def = "{'exam_id': 1, 'submitted_at': -1}"),
        @CompoundIndex(name = "idx_sub_user",  def = "{'user_id': 1, 'submitted_at': -1}"),
        @CompoundIndex(name = "idx_sub_store", def = "{'store_id': 1, 'submitted_at': -1}")
})
public class ExamSubmission {

    @Id
    private String id;

    @Field("exam_id")
    private String examId;

    /** Título desnormalizado para mantener histórico legible. */
    @Field("exam_title")
    private String examTitle;

    @Field("user_id")
    private String userId;

    @Field("user_name")
    private String userName;

    @Field("user_numero")
    private String userNumero;

    @Field("store_id")
    private String storeId;

    /** Índice de la opción elegida por pregunta (mismo orden que exam.questions). */
    @Field("answers")
    private List<Integer> answers;

    /** Puntaje obtenido (0.0–100.0). */
    @Field("score")
    private double score;

    @Field("passed")
    private boolean passed;

    @Field("time_taken_seconds")
    private Integer timeTakenSeconds;

    @Field("submitted_at")
    private Instant submittedAt;

    @CreatedDate
    @Field("created_at")
    private Instant createdAt;
}
