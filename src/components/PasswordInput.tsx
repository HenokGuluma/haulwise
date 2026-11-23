"use client";

import { forwardRef, useState } from "react";
import { Icon } from "@/components/ui";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Password field with a show/hide toggle. Mistyping a password on a phone
 * keyboard is common and invisible otherwise, so the reveal button matters
 * most there; it's harmless on desktop too.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className = "", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        ref={ref}
        {...props}
        type={visible ? "text" : "password"}
        className={"input " + className}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
});
