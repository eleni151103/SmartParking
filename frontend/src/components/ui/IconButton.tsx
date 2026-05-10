

import type { ButtonHTMLAttributes } from "react";


type Props = ButtonHTMLAttributes<HTMLButtonElement>;


export default function IconButton({ children, ...props }: Props) {
    return (
        <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-500"
            {...props}
        >
            {children}  {}
        </button>
    );
}
