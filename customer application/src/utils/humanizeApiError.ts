const OTP_EXPIRED =
  'This code has expired. Tap Resend OTP for a new code.';

/**
 * Strip vendor / internal API text before showing errors in the mobile UI.
 */
export function humanizeApiErrorMessage(message: string, fallback = 'Something went wrong'): string {
  const text = message.trim();
  if (!text) return fallback;

  const lower = text.toLowerCase();

  if (lower.includes('already used')) {
    return 'This code was already used. Tap Resend OTP for a fresh code.';
  }

  const looksLikeOtp =
    lower.includes('otp') ||
    lower.includes('verify-otp') ||
    lower.includes('verification code') ||
    lower.includes('verification_expired') ||
    lower.includes('hanu');

  if (looksLikeOtp && (lower.includes('expired') || lower.includes('verification_expired'))) {
    return OTP_EXPIRED;
  }

  if (lower.includes('expired') && (lower.includes('token') || lower.includes('jwt') || lower.includes('session'))) {
    return 'Your session expired. Please sign in again.';
  }

  if (lower.includes('expired') && !looksLikeOtp) {
    return text.length > 120 ? fallback : text;
  }

  if (
    lower.includes('hanu') ||
    lower.includes('verify-otp error') ||
    lower.includes('send-otp failed') ||
    lower.includes('unknown_error')
  ) {
    if (lower.includes('wrong') || lower.includes('invalid otp')) {
      return 'Incorrect code. Check the SMS and try again.';
    }
    if (lower.includes('limit') || lower.includes('too many')) {
      return 'Too many attempts. Wait a moment, then tap Resend OTP.';
    }
    if (lower.includes('not configured') || lower.includes('unavailable')) {
      return 'Sign-in is temporarily unavailable. Please try again shortly.';
    }
    return 'Could not verify the code. Tap Resend OTP and try again.';
  }

  if (lower.includes('network error') || lower.includes('cannot reach')) {
    return 'No connection to RACE. Check your internet and try again.';
  }

  if (lower.includes('timeout')) {
    return 'The server took too long to respond. Try again.';
  }

  if (lower.includes('invalid otp') || lower.includes('wrong_otp')) {
    return 'Incorrect code. Check the SMS and try again.';
  }

  return text;
}
