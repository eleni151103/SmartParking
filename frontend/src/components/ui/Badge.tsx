

import type { PropsWithChildren } from "react";


export default function Badge({ children }: PropsWithChildren) {
    return (

        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {children}
        </span>
    );
}
