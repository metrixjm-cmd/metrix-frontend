package com.metrix.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ExamSubmissionResponse {

    private String id;
    private String examId;
    private String examTitle;
    private String userName;
    private String userNumero;
    private String storeId;
    private double score;
    private boolean passed;
    private int passingScore;
    private Integer timeTakenSeconds;
    private Instant submittedAt;

    /** Desglose pregunta a pregunta — solo se llena al momento de entregar. */
    private List<QuestionResult> questionResults;

    @Data
    @Builder
    public static class QuestionResult {
        private String questionText;
        private List<String> options;
        private int selectedIndex;
        private int correctIndex;
        private boolean correct;
        private int pointsEarned;
        private int pointsMax;
    }
}
