package com.metrix.api.repository;

import com.metrix.api.model.ExamSubmission;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExamSubmissionRepository extends MongoRepository<ExamSubmission, String> {

    List<ExamSubmission> findByExamIdOrderBySubmittedAtDesc(String examId);

    List<ExamSubmission> findByUserIdOrderBySubmittedAtDesc(String userId);

    List<ExamSubmission> findByStoreIdOrderBySubmittedAtDesc(String storeId);

    Optional<ExamSubmission> findFirstByExamIdAndUserIdOrderBySubmittedAtDesc(String examId, String userId);

    long countByExamId(String examId);

    long countByExamIdAndPassedTrue(String examId);
}
