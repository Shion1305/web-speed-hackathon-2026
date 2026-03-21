import { useForm, useWatch } from "react-hook-form";

import { AuthFormData } from "@web-speed-hackathon-2026/client/src/auth/types";
import {
  validate,
  validateName,
  validatePassword,
  validateUsername,
} from "@web-speed-hackathon-2026/client/src/auth/validation";
import { FormInputField } from "@web-speed-hackathon-2026/client/src/components/foundation/FormInputField";
import { Link } from "@web-speed-hackathon-2026/client/src/components/foundation/Link";
import { ModalErrorMessage } from "@web-speed-hackathon-2026/client/src/components/modal/ModalErrorMessage";
import { ModalSubmitButton } from "@web-speed-hackathon-2026/client/src/components/modal/ModalSubmitButton";

interface Props {
  onRequestCloseModal: () => void;
  onSubmit: (values: AuthFormData) => Promise<void>;
  serverError?: string;
}

export const AuthModalPage = ({ onRequestCloseModal, onSubmit, serverError }: Props) => {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AuthFormData>({
    defaultValues: { type: "signin" },
    mode: "onTouched",
  });

  const type = useWatch({ control, name: "type" }) ?? "signin";

  return (
    <form
      className="grid gap-y-6"
      onSubmit={handleSubmit(async (values) => {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) return;
        await onSubmit(values);
      })}
    >
      <h2 className="text-center text-2xl font-bold">
        {type === "signin" ? "サインイン" : "新規登録"}
      </h2>

      <div className="flex justify-center">
        <button
          className="text-cax-brand underline"
          onClick={() => setValue("type", type === "signin" ? "signup" : "signin")}
          type="button"
        >
          {type === "signin" ? "初めての方はこちら" : "サインインはこちら"}
        </button>
      </div>

      <div className="grid gap-y-2">
        <FormInputField
          label="ユーザー名"
          leftItem={<span className="text-cax-text-subtle leading-none">@</span>}
          autoComplete="username"
          error={errors.username?.message}
          {...register("username", {
            validate: (v) => validateUsername(v) ?? true,
          })}
        />

        {type === "signup" && (
          <FormInputField
            label="名前"
            autoComplete="nickname"
            error={errors.name?.message}
            {...register("name", {
              validate: (v) => validateName(v, type) ?? true,
            })}
          />
        )}

        <FormInputField
          label="パスワード"
          type="password"
          autoComplete={type === "signup" ? "new-password" : "current-password"}
          error={errors.password?.message}
          {...register("password", {
            validate: (v) => validatePassword(v) ?? true,
          })}
        />
      </div>

      {type === "signup" ? (
        <p>
          <Link className="text-cax-brand underline" onClick={onRequestCloseModal} to="/terms">
            利用規約
          </Link>
          に同意して
        </p>
      ) : null}

      <ModalSubmitButton disabled={isSubmitting || !isValid} loading={isSubmitting}>
        {type === "signin" ? "サインイン" : "登録する"}
      </ModalSubmitButton>

      <ModalErrorMessage>{serverError}</ModalErrorMessage>
    </form>
  );
};
