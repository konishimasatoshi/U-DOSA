import type { SVGProps } from "react";

// うんちのアイコン(3 段のソフトクリーム型)。lucide-react にないため、
// lucide と同じ書き方(24px 四方、線の太さ 2、角は丸め、色は currentColor)で描いている。
export function PoopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5.5 21h13a2.5 2.5 0 0 0 0-5h-13a2.5 2.5 0 0 0 0 5Z" />
      <path d="M7.5 16h9a2.25 2.25 0 0 0 0-4.5h-9a2.25 2.25 0 0 0 0 4.5Z" />
      <path d="M9.5 11.5h5a2 2 0 0 0 0-4h-5a2 2 0 0 0 0 4Z" />
      <path d="M12 7.5c0-1.8 1-3 3-3.5" />
    </svg>
  );
}
