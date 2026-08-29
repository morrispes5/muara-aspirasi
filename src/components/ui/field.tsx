import type { ComponentPropsWithoutRef } from "react";

type FieldProps = {
  hint?: string;
  label: string;
};

type InputProps = ComponentPropsWithoutRef<"input"> & FieldProps;
type TextareaProps = ComponentPropsWithoutRef<"textarea"> & FieldProps;

const fieldClassName =
  "w-full rounded-control border border-line bg-surface px-3 py-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none";

export function InputField({ hint, label, ...props }: InputProps) {
  return (
    <label className="text-ink grid gap-2 text-sm font-bold">
      {label}
      <input className={fieldClassName} {...props} />
      {hint ? (
        <span className="text-muted text-xs leading-5 font-normal">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextareaField({ hint, label, ...props }: TextareaProps) {
  return (
    <label className="text-ink grid gap-2 text-sm font-bold">
      {label}
      <textarea className={`${fieldClassName} min-h-28 resize-y`} {...props} />
      {hint ? (
        <span className="text-muted text-xs leading-5 font-normal">{hint}</span>
      ) : null}
    </label>
  );
}
