import { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger";
}

export function Button({ children, variant = "primary", ...rest }: PropsWithChildren<ButtonProps>) {
  return (
    <button className={`btn ${variant === "primary" ? "btn-primary" : "btn-danger"}`} {...rest}>
      {children}
    </button>
  );
}
