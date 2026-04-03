import { createHmac } from "node:crypto";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");

/**
 * Verify Paystack webhook signature
 * @param body The raw request body as a string
 * @param signature The X-Paystack-Signature header value
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaystackSignature(body: string, signature: string): boolean {
  if (!PAYSTACK_SECRET) {
    console.warn("⚠️ PAYSTACK_SECRET_KEY not configured - webhook verification disabled");
    return false;
  }

  try {
    const hash = createHmac("sha512", PAYSTACK_SECRET)
      .update(body)
      .digest("hex");

    return hash === signature;
  } catch (error) {
    console.error("❌ Error verifying Paystack signature:", error);
    return false;
  }
}

/**
 * Validate payment webhook before processing
 */
export function validatePaymentWebhook(body: any): { valid: boolean; error?: string } {
  if (!body.event) {
    return { valid: false, error: "Missing event field" };
  }

  if (!body.data) {
    return { valid: false, error: "Missing data field" };
  }

  if (!body.data.reference) {
    return { valid: false, error: "Missing reference in payment data" };
  }

  if (body.event !== "charge.success" && body.event !== "charge.complete") {
    return { valid: false, error: `Unsupported event type: ${body.event}` };
  }

  return { valid: true };
}

/**
 * OWASP-compliant input sanitization
 */
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Remove potential XSS vectors
    return input
      .replace(/[<>\"'`]/g, (char) => {
        const map: Record<string, string> = {
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "`": "&#x60;",
        };
        return map[char] || char;
      })
      .slice(0, 1000); // Limit string length
  }

  if (Array.isArray(input)) {
    return input.slice(0, 100).map(sanitizeInput); // Limit array size
  }

  if (input !== null && typeof input === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input).slice(0, 50)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * SQL Injection prevention - escape identifiers
 */
export function escapeIdentifier(identifier: string): string {
  // Only allow alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return identifier;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
}

/**
 * Check for suspicious patterns in user input
 */
export function containsSuspiciousPatterns(input: string): boolean {
  const suspicious = [
    /script/i,
    /onerror/i,
    /onclick/i,
    /javascript:/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return suspicious.some((pattern) => pattern.test(input));
}

/**
 * Rate limit check helper
 */
export function isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
  const key = `rate_limit:${identifier}`;
  // This would be implemented with a real cache/store in production
  console.warn(
    `⚠️ Rate limiting should use Redis or dedicated service. Current check: ${key}`
  );
  return false;
}
