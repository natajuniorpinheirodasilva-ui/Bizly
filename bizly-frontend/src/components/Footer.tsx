import React from 'react'

export default function Footer() {
    return (
        <footer className="border-t border-border py-4 text-center text-xs text-foreground-muted">
            © {new Date().getFullYear()} Bizly. All rights reserved.
        </footer>
    )
}
