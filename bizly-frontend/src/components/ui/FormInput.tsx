import { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"input">

export default function FormInput({ className, ...props }: Props) {
    return (
        <input
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-base text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
    )
}
