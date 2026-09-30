import type { ChangeEventHandler } from "react";

type Props = {
    id?: string;
    type?: "text" | "password" | "email" | "number" | "tel";
    placeholder?: string;
    autoComplete?: string;
    value?: string | number;
    required?: boolean
    onChange?: ChangeEventHandler<HTMLInputElement>;
}


export default function FormInput({ autoComplete, id, type, placeholder, onChange, value, required }: Props) {
    return (
        <input
            autoComplete={autoComplete}
            id={id}
            required={required}
            type={type}
            placeholder={placeholder}
            onChange={onChange}
            value={value}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-base text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
    )
}