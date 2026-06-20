export interface LoginInput {
  email: string;
  password: string;
}

export interface RegistrationInput extends LoginInput {
  displayName: string;
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateLoginInput(email: string, password: string): ValidationResult<LoginInput> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail.includes("@")) {
    return { ok: false, error: "유효한 이메일을 입력해주세요." };
  }

  if (password.trim().length < 4) {
    return { ok: false, error: "비밀번호는 4자 이상이어야 합니다." };
  }

  return {
    ok: true,
    value: {
      email: normalizedEmail,
      password,
    },
  };
}

export function validateRegistrationInput(
  email: string,
  password: string,
  displayName: string,
): ValidationResult<RegistrationInput> {
  const loginValidation = validateLoginInput(email, password);
  if (!loginValidation.ok) {
    return loginValidation;
  }

  const normalizedDisplayName = displayName.trim();
  if (normalizedDisplayName.length === 0) {
    return { ok: false, error: "이름을 입력해주세요." };
  }

  return {
    ok: true,
    value: {
      ...loginValidation.value,
      displayName: normalizedDisplayName,
    },
  };
}
