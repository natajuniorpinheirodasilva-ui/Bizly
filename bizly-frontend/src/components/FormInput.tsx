type Props = {
    autoComplete?: string;
    id?: string;
    type?: string;
    placeholder?: string;
}


export default function FormInput({autoComplete, id, type, placeholder}: Props) {
    return (
        <input
            autoComplete={autoComplete}
            required
            id={id}
            type={type}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-input px-4 py-3 text-base text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
    )
}