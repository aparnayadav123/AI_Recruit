package com.recruitai.agent.validation;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents the result of a validation operation with detailed error tracking
 */
public class ValidationResult {

    private boolean valid;
    private String fieldName;
    private Object value;
    private List<String> errors;
    private String validationRule;

    public ValidationResult(String fieldName) {
        this.fieldName = fieldName;
        this.valid = true;
        this.errors = new ArrayList<>();
    }

    public ValidationResult(String fieldName, Object value) {
        this(fieldName);
        this.value = value;
    }

    public static ValidationResult success(String fieldName, Object value) {
        ValidationResult result = new ValidationResult(fieldName, value);
        result.setValid(true);
        return result;
    }

    public static ValidationResult failure(String fieldName, String error) {
        ValidationResult result = new ValidationResult(fieldName);
        result.setValid(false);
        result.addError(error);
        return result;
    }

    public static ValidationResult notFound(String fieldName) {
        ValidationResult result = new ValidationResult(fieldName);
        result.setValid(false);
        result.setValue("NOT_FOUND");
        result.addError(fieldName + " not found in resume");
        return result;
    }

    public void addError(String error) {
        this.valid = false;
        if (this.errors == null) {
            this.errors = new ArrayList<>();
        }
        this.errors.add(error);
    }

    // Getters and Setters
    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    public String getValidationRule() {
        return validationRule;
    }

    public void setValidationRule(String validationRule) {
        this.validationRule = validationRule;
    }

    public String getErrorMessage() {
        return errors != null && !errors.isEmpty() ? String.join(", ", errors) : "";
    }

    @Override
    public String toString() {
        return "ValidationResult{" +
                "valid=" + valid +
                ", fieldName='" + fieldName + '\'' +
                ", value=" + value +
                ", errors=" + errors +
                '}';
    }
}
