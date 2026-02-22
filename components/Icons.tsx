// app/components/Icons.tsx
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

export function AccountIcon({ size = 22, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SettingsCogIcon({ size = 22, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 0-3.5-3.5 3.5 3.5 0 0 0 3.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13a7.7 7.7 0 0 0 .06-2l2-1.2-2-3.5-2.3.7a7.8 7.8 0 0 0-1.7-1L15 3h-6l-.4 3a7.8 7.8 0 0 0-1.7 1L4.6 6.3l-2 3.5 2 1.2a7.7 7.7 0 0 0 0 2l-2 1.2 2 3.5 2.3-.7a7.8 7.8 0 0 0 1.7 1l.4 3h6l.4-3a7.8 7.8 0 0 0 1.7-1l2.3.7 2-3.5-2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}