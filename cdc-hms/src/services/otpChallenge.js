/**
 * The one place that recognises "two-factor is on, here is your challenge".
 *
 * The backend answers a correct password with 401 + code OTP_REQUIRED, which
 * axios rejects. Two call sites sign in with a password — authService.login and
 * hrService.loginRemember (the HR tap page) — and both have to turn that
 * rejection into a value rather than an error, because it is a step in a
 * successful sign-in, not a failure.
 *
 * Kept here so there is one definition of what that response looks like. A copy
 * in each service is how one of them ends up not reading `expiresMinutes`, or
 * keeps working after the field is renamed while the other quietly breaks.
 */
export const asOtpChallenge = (err) => {
  if (err?.data?.code !== 'OTP_REQUIRED') return null;
  return {
    success: false,
    otpRequired: true,
    challengeId: err.data.challengeId,
    maskedEmail: err.data.maskedEmail,
    expiresMinutes: err.data.expiresMinutes,
    message: err.data.message,
  };
};

export default asOtpChallenge;
