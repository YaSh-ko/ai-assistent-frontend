import { createAuthClient } from "better-auth/react"

// В dev режиме запросы идут через Vite proxy (см. vite.config.ts)
// В production — напрямую на API
const isProduction = import.meta.env.PROD

export const authClient = createAuthClient({
    baseURL: isProduction ? "https://api.delez-repo.ru" : "",
    basePath: "/auth"
})



