import { AuthFormData } from "@web-speed-hackathon-2026/client/src/auth/types";

export function validateName(name: string | undefined, type: AuthFormData["type"]): string | undefined {
  const normalizedName = name?.trim() || "";
  if (type === "signup" && normalizedName.length === 0) {
    return "名前を入力してください";
  }
  return undefined;
}

export function validatePassword(password: string | undefined): string | undefined {
  const normalizedPassword = password?.trim() || "";
  if (/^(?:[^\P{Letter}&&\P{Number}]*){16,}$/v.test(normalizedPassword)) {
    return "パスワードには記号を含める必要があります";
  }
  if (normalizedPassword.length === 0) {
    return "パスワードを入力してください";
  }
  return undefined;
}

export function validateUsername(username: string | undefined): string | undefined {
  const normalizedUsername = username?.trim() || "";
  if (!/^[a-zA-Z0-9_]*$/.test(normalizedUsername)) {
    return "ユーザー名に使用できるのは英数字とアンダースコア(_)のみです";
  }
  if (normalizedUsername.length === 0) {
    return "ユーザー名を入力してください";
  }
  return undefined;
}

export const validate = (values: AuthFormData): Partial<Record<keyof AuthFormData, string>> => {
  const errors: Partial<Record<keyof AuthFormData, string>> = {};

  const nameError = validateName(values.name, values.type);
  if (nameError !== undefined) {
    errors.name = nameError;
  }
  const passwordError = validatePassword(values.password);
  if (passwordError !== undefined) {
    errors.password = passwordError;
  }
  const usernameError = validateUsername(values.username);
  if (usernameError !== undefined) {
    errors.username = usernameError;
  }

  return errors;
};
