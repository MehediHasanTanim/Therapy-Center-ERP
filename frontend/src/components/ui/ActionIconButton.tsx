import { ButtonHTMLAttributes } from "react";

type ActionType = "view" | "edit" | "delete";

interface ActionIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  action: ActionType;
}

export function ActionIconButton({ action, className = "", ...rest }: ActionIconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn icon-only ${action === "delete" ? "danger" : ""} ${className}`.trim()}
      {...rest}
    >
      {action === "view" ? <ViewIcon /> : null}
      {action === "edit" ? <EditIcon /> : null}
      {action === "delete" ? <DeleteIcon /> : null}
    </button>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5c5.1 0 9.3 3 11 7-1.7 4-5.9 7-11 7S2.7 16 1 12c1.7-4 5.9-7 11-7zm0 2C8 7 4.7 9.2 3.2 12 4.7 14.8 8 17 12 17s7.3-2.2 8.8-5C19.3 9.2 16 7 12 7zm0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.8 3.5l3.7 3.7-10.9 11H6v-3.6l10.8-11.1zM5 20h14v2H5z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm-1 6h2v9H8V9zm6 0h2v9h-2V9zM6 9h2v9H6V9z"
      />
    </svg>
  );
}
