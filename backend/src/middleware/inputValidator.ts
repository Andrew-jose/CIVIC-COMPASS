import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Detect SQL injection basic patterns
const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)|(--)/i;
// Detect prompt injection attempts
const promptInjectionPattern = /(ignore previous instructions|system:|you are now|disregard your rules|new persona)/i;

// Regex for valid US address (simplified but safe for this scope)
const usAddressRegex = /^[A-Za-z0-9\s,\.\-#]+$/;

// 1. Chat Message Schema
const chatMessageSchema = z.object({
  message: z.string()
    .max(500, "Message too long")
    .transform(val => val.replace(/<[^>]*>?/gm, '')) // Strip HTML tags
    .refine(val => !promptInjectionPattern.test(val), "Prompt injection detected")
});

// 2. Address Input Schema
const addressInputSchema = z.object({
  address: z.string()
    .max(200, "Address too long")
    .regex(usAddressRegex, "Invalid characters in address")
    .refine(val => !sqlInjectionPattern.test(val), "SQL injection pattern detected")
    .refine(val => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val), "Script tags detected")
});

// 3. Ballot PDF Upload Schema (filename check)
const ballotFilenameSchema = z.object({
  filename: z.string()
    .refine(val => !val.includes('../') && !val.includes('..\\'), "Path traversal attempt detected")
});

// 4. Jurisdiction Query Params Schema
const jurisdictionParamsSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/, "State must be a 2-letter uppercase code"),
  county: z.string()
    .max(60, "County name too long")
    .regex(/^[A-Za-z0-9\s]+$/, "County must be alphanumeric and spaces only")
});

// 5. Language Param Schema
const languageParamSchema = z.object({
  language: z.enum(['English', 'Español', 'Français', 'Deutsch', '中文', '日本語', 'العربية', '한국어'])
});

// Helper for generating middleware
function createValidator(schema: z.ZodTypeAny, source: 'body' | 'query' | 'params' | 'file') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (source === 'file') {
        if (!req.file) return res.status(400).json({ error: "File required", field: "file", code: "MISSING_FILE" });
        if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: "Invalid file type", field: "file", code: "INVALID_MIME" });
        if (req.file.size > 10 * 1024 * 1024) return res.status(413).json({ error: "File too large", field: "file", code: "FILE_TOO_LARGE" });
        
        // Validate magic bytes for PDF (%PDF-)
        const magicBytes = req.file.buffer.toString('utf8', 0, 5);
        if (magicBytes !== '%PDF-') return res.status(400).json({ error: "Invalid file signature", field: "file", code: "INVALID_SIGNATURE" });

        // Validate filename
        schema.parse({ filename: req.file.originalname });
      } else {
        const data = schema.parse(req[source]);
        // Overwrite req data with sanitized data
        req[source] = data;
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const zodErr = err as any;
        return res.status(400).json({
          error: "Validation failed",
          field: zodErr.errors[0].path.join('.'),
          code: "VALIDATION_ERROR",
          allowedFormat: zodErr.errors[0].message
        });
      }
      return res.status(400).json({ error: "Invalid input" });
    }
  };
}

// Exported Middlewares
export const validateChatMessage = createValidator(chatMessageSchema, 'body');
export const validateAddressInput = createValidator(addressInputSchema, 'body');
export const validateJurisdictionParams = createValidator(jurisdictionParamsSchema, 'query');
export const validateLanguageParam = createValidator(languageParamSchema, 'query');
export const validateBallotUpload = createValidator(ballotFilenameSchema, 'file');
