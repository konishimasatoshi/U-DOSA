import * as React from "react";
import { cn } from "cn";

// design_system.md の「入力フィールド」: 白背景、gray-300 の枠線、rounded-lg、高さ 48px。
// フォーカスは青、エラー（aria-invalid）は赤の枠線とリング。
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 shadow-sm transition-colors duration-150 ease-in-out outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-gray-900 placeholder:text-gray-500 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
