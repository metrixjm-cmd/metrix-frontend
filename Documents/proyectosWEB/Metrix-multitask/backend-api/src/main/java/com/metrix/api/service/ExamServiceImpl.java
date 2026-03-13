package com.metrix.api.service;

import com.metrix.api.dto.*;
import com.metrix.api.exception.ResourceNotFoundException;
import com.metrix.api.model.*;
import com.metrix.api.repository.ExamRepository;
import com.metrix.api.repository.ExamSubmissionRepository;
import com.metrix.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

/**
 * Implementación del módulo Trainer — exámenes y calificación automática (Sprint 19).
 * <p>
 * Flujo principal:
 * <ol>
 *   <li>GERENTE/ADMIN crea un examen con preguntas (MC o TF).</li>
 *   <li>Colaborador obtiene {@link ExamForTakeResponse} (sin respuestas correctas).</li>
 *   <li>Colaborador envía sus respuestas → el sistema califica y persiste {@link ExamSubmission}.</li>
 *   <li>GERENTE/ADMIN consulta el historial de submissions.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class ExamServiceImpl implements ExamService {

    private final ExamRepository examRepo;
    private final ExamSubmissionRepository submissionRepo;
    private final UserRepository userRepo;

    // ── Crear examen ──────────────────────────────────────────────────────

    @Override
    public ExamResponse create(CreateExamRequest request, String creatorNumeroUsuario) {
        User creator = userRepo.findByNumeroUsuario(creatorNumeroUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + creatorNumeroUsuario));

        List<ExamQuestion> questions = request.getQuestions().stream()
                .map(q -> ExamQuestion.builder()
                        .id(UUID.randomUUID().toString())
                        .questionText(q.getQuestionText())
                        .type(q.getType())
                        .options(q.getOptions())
                        .correctOptionIndex(q.getCorrectOptionIndex())
                        .points(q.getPoints() > 0 ? q.getPoints() : 1)
                        .build())
                .toList();

        Exam exam = Exam.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .trainingId(request.getTrainingId())
                .storeId(request.getStoreId())
                .questions(questions)
                .passingScore(request.getPassingScore() > 0 ? request.getPassingScore() : 70)
                .timeLimitMinutes(request.getTimeLimitMinutes())
                .createdByUserId(creator.getId())
                .createdByName(creator.getNombre())
                .build();

        Exam saved = examRepo.save(exam);
        return toResponse(saved);
    }

    // ── Consultas ─────────────────────────────────────────────────────────

    @Override
    public List<ExamResponse> getByStore(String storeId) {
        return examRepo.findByStoreIdAndActivoTrue(storeId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public ExamResponse getById(String examId) {
        Exam exam = findExamOrThrow(examId);
        return toResponse(exam);
    }

    @Override
    public ExamForTakeResponse getForTake(String examId) {
        Exam exam = findExamOrThrow(examId);

        List<ExamForTakeResponse.QuestionForTake> questions = exam.getQuestions().stream()
                .map(q -> ExamForTakeResponse.QuestionForTake.builder()
                        .id(q.getId())
                        .questionText(q.getQuestionText())
                        .type(q.getType())
                        .options(q.getOptions())
                        .points(q.getPoints())
                        .build())
                .toList();

        return ExamForTakeResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .description(exam.getDescription())
                .passingScore(exam.getPassingScore())
                .timeLimitMinutes(exam.getTimeLimitMinutes())
                .questionCount(exam.getQuestions().size())
                .questions(questions)
                .build();
    }

    // ── Enviar respuestas y calificar ─────────────────────────────────────

    @Override
    public ExamSubmissionResponse submit(String examId, SubmitExamRequest request, String userNumeroUsuario) {
        Exam exam = findExamOrThrow(examId);
        User user = userRepo.findByNumeroUsuario(userNumeroUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userNumeroUsuario));

        List<ExamQuestion> questions = exam.getQuestions();
        List<Integer> answers = request.getAnswers();

        // ── Calificación automática ───────────────────────────────────────
        double totalPoints = questions.stream().mapToInt(ExamQuestion::getPoints).sum();
        double earnedPoints = 0;

        List<ExamSubmissionResponse.QuestionResult> questionResults = new ArrayList<>();

        for (int i = 0; i < questions.size(); i++) {
            ExamQuestion q = questions.get(i);
            int selected = (i < answers.size()) ? answers.get(i) : -1;
            boolean correct = selected == q.getCorrectOptionIndex();
            int earned = correct ? q.getPoints() : 0;
            earnedPoints += earned;

            questionResults.add(ExamSubmissionResponse.QuestionResult.builder()
                    .questionText(q.getQuestionText())
                    .options(q.getOptions())
                    .selectedIndex(selected)
                    .correctIndex(q.getCorrectOptionIndex())
                    .correct(correct)
                    .pointsEarned(earned)
                    .pointsMax(q.getPoints())
                    .build());
        }

        double score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100.0 : 0.0;
        boolean passed = score >= exam.getPassingScore();

        // ── Persistir submission ──────────────────────────────────────────
        ExamSubmission submission = ExamSubmission.builder()
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .userId(user.getId())
                .userName(user.getNombre())
                .userNumero(user.getNumeroUsuario())
                .storeId(exam.getStoreId())
                .answers(answers)
                .score(Math.round(score * 10.0) / 10.0)
                .passed(passed)
                .timeTakenSeconds(request.getTimeTakenSeconds())
                .submittedAt(Instant.now())
                .build();

        ExamSubmission saved = submissionRepo.save(submission);

        return toSubmissionResponse(saved, questionResults, exam.getPassingScore());
    }

    // ── Historial de submissions ──────────────────────────────────────────

    @Override
    public List<ExamSubmissionResponse> getSubmissions(String examId) {
        findExamOrThrow(examId);
        return submissionRepo.findByExamIdOrderBySubmittedAtDesc(examId).stream()
                .map(s -> toSubmissionResponse(s, null, 0))
                .toList();
    }

    @Override
    public List<ExamSubmissionResponse> getMySubmissions(String userNumeroUsuario) {
        User user = userRepo.findByNumeroUsuario(userNumeroUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + userNumeroUsuario));

        return submissionRepo.findByUserIdOrderBySubmittedAtDesc(user.getId()).stream()
                .map(s -> toSubmissionResponse(s, null, 0))
                .toList();
    }

    // ── Helpers privados ──────────────────────────────────────────────────

    private Exam findExamOrThrow(String examId) {
        return examRepo.findById(examId)
                .filter(Exam::isActivo)
                .orElseThrow(() -> new ResourceNotFoundException("Examen no encontrado: " + examId));
    }

    private ExamResponse toResponse(Exam exam) {
        long submissionCount = submissionRepo.countByExamId(exam.getId());
        long passedCount = submissionRepo.countByExamIdAndPassedTrue(exam.getId());
        int passRate = submissionCount > 0 ? (int) Math.round((passedCount * 100.0) / submissionCount) : 0;

        List<ExamResponse.QuestionDto> questions = exam.getQuestions().stream()
                .map(q -> ExamResponse.QuestionDto.builder()
                        .id(q.getId())
                        .questionText(q.getQuestionText())
                        .type(q.getType())
                        .options(q.getOptions())
                        .correctOptionIndex(q.getCorrectOptionIndex())
                        .points(q.getPoints())
                        .build())
                .toList();

        return ExamResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .description(exam.getDescription())
                .trainingId(exam.getTrainingId())
                .storeId(exam.getStoreId())
                .questions(questions)
                .passingScore(exam.getPassingScore())
                .timeLimitMinutes(exam.getTimeLimitMinutes())
                .createdByName(exam.getCreatedByName())
                .createdAt(exam.getCreatedAt())
                .updatedAt(exam.getUpdatedAt())
                .submissionCount(submissionCount)
                .passRate(passRate)
                .build();
    }

    private ExamSubmissionResponse toSubmissionResponse(ExamSubmission s,
                                                         List<ExamSubmissionResponse.QuestionResult> results,
                                                         int passingScore) {
        // If passingScore not passed, try to look it up
        int ps = passingScore;
        if (ps == 0 && s.getExamId() != null) {
            ps = examRepo.findById(s.getExamId())
                    .map(Exam::getPassingScore)
                    .orElse(70);
        }

        return ExamSubmissionResponse.builder()
                .id(s.getId())
                .examId(s.getExamId())
                .examTitle(s.getExamTitle())
                .userName(s.getUserName())
                .userNumero(s.getUserNumero())
                .storeId(s.getStoreId())
                .score(s.getScore())
                .passed(s.isPassed())
                .passingScore(ps)
                .timeTakenSeconds(s.getTimeTakenSeconds())
                .submittedAt(s.getSubmittedAt())
                .questionResults(results)
                .build();
    }
}
