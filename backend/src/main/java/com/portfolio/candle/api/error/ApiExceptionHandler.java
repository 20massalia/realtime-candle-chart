package com.portfolio.candle.api.error;

import com.portfolio.candle.api.dto.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler({
        MethodArgumentNotValidException.class,
        BindException.class,
        ConstraintViolationException.class,
        HandlerMethodValidationException.class,
        HttpMessageNotReadableException.class,
        InvalidQueryException.class
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse invalidQuery(Exception ex) {
        return new ErrorResponse("INVALID_QUERY", firstMessage(ex), traceId());
    }

    @ExceptionHandler(UnknownSymbolException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse unknownSymbol(UnknownSymbolException ex) {
        return new ErrorResponse("UNKNOWN_SYMBOL", ex.getMessage(), traceId());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse unexpected(Exception ex) {
        return new ErrorResponse("INTERNAL_ERROR", "Unexpected error", traceId());
    }

    private static String firstMessage(Exception ex) {
        if (ex instanceof MethodArgumentNotValidException manv && manv.getBindingResult().getFieldError() != null) {
            return manv.getBindingResult().getFieldError().getDefaultMessage();
        }
        if (ex instanceof BindException bind && bind.getBindingResult().getFieldError() != null) {
            return bind.getBindingResult().getFieldError().getDefaultMessage();
        }
        if (ex instanceof ConstraintViolationException cve && !cve.getConstraintViolations().isEmpty()) {
            return cve.getConstraintViolations().iterator().next().getMessage();
        }
        if (ex instanceof InvalidQueryException || ex instanceof HttpMessageNotReadableException) {
            return ex.getMessage() == null ? "Invalid query" : ex.getMessage();
        }
        return "Invalid query";
    }

    private static String traceId() {
        return UUID.randomUUID().toString();
    }
}
