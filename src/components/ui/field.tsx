"use client";

import { type ComponentPropsWithoutRef, useId } from "react";

type FieldProps = {
  hint?: string;
  label: string;
};

type InputProps = ComponentPropsWithoutRef<"input"> & FieldProps;
type TextareaProps = ComponentPropsWithoutRef<"textarea"> & FieldProps;

/**
 * No `outline-none` here. `globals.css` defines the shared focus ring on
 * `:focus-visible`, and a `focus:outline-none` utility outranks it on
 * specificity, which would silently remove the only visible focus indicator
 * these controls have. `focus:border-brand` stays as an additional affordance,
 * not as a replacement for the ring.
 */
const fieldClassName =
  "w-full rounded-control border border-line bg-surface px-3 py-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand";

/**
 * The hint is rendered outside the `<label>` and wired up with
 * `aria-describedby`. Nesting it inside the label would fold the hint into the
 * control's accessible *name* — a screen reader would read the label and the
 * whole hint as one run-on name — when it is a description.
 * See docs/UX_UI_DESIGN_SYSTEM.md section 11.
 */
export function InputField({ hint, id, label, ...props }: InputProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;

  return (
    <div className="grid gap-2">
      <label className="text-ink text-sm font-bold" htmlFor={controlId}>
        {label}
      </label>
      <input
        aria-describedby={hint ? hintId : undefined}
        className={fieldClassName}
        id={controlId}
        {...props}
      />
      {hint ? (
        <span className="text-muted text-xs leading-5 font-normal" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function TextareaField({ hint, id, label, ...props }: TextareaProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;

  return (
    <div className="grid gap-2">
      <label className="text-ink text-sm font-bold" htmlFor={controlId}>
        {label}
      </label>
      <textarea
        aria-describedby={hint ? hintId : undefined}
        className={`${fieldClassName} min-h-28 resize-y`}
        id={controlId}
        {...props}
      />
      {hint ? (
        <span className="text-muted text-xs leading-5 font-normal" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
