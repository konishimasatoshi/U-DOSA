import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

// design_system.md の「7. コンポーネント設計」に合わせたボタン。
// すべてのバリアントに影を付け、タッチターゲットは 44px 以上を確保する。
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-200 ease-in-out outline-none select-none not-disabled:hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 not-disabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-red-500 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // プライマリ: 主要アクション
        default:
          "bg-blue-500 text-white shadow-md not-disabled:hover:bg-blue-600 not-disabled:hover:shadow-lg",
        // セカンダリ: 白背景 + 青の枠線
        secondary:
          "border-2 border-blue-700 bg-white text-blue-700 shadow-sm not-disabled:hover:bg-blue-50 not-disabled:hover:shadow-md",
        // アウトライン: キャンセルなどの控えめな操作
        outline:
          "border border-gray-300 bg-white text-gray-700 shadow-sm not-disabled:hover:border-gray-400 not-disabled:hover:text-gray-900 not-disabled:hover:shadow-md",
        // 危険: 削除など
        destructive:
          "bg-red-600 text-white shadow-md not-disabled:hover:bg-red-700 not-disabled:hover:shadow-lg",
      },
      size: {
        sm: "h-11 rounded-lg px-3 text-sm",
        default: "h-12 rounded-xl px-6 text-base",
        lg: "h-14 rounded-2xl px-8 text-lg",
        icon: "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
