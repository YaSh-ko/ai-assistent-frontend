export const validateEmail = (email: string) => {
    // Более строгая валидация email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
};

export const validatePassword = (password: string) => {
    return password.length >= 8;
};

export const mapAuthError = (message: string | undefined): string => {
    // Simple mapping for common better-auth and validation errors
    if (!message) return "Что-то пошло не так. Попробуйте позже";

    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("invalid email")) return "Некорректный формат email-адреса";
    if (lowerMsg.includes("password") && lowerMsg.includes("short")) return "Пароль слишком короткий (минимум 8 символов)";
    if (lowerMsg.includes("exists") || lowerMsg.includes("уже зарегистрирован") || lowerMsg.includes("already registered") || lowerMsg.includes("user with this email already exists") || lowerMsg.includes("useralreadyexistsexception")) return "Аккаунт уже зарегистрирован";
    if (lowerMsg.includes("invalid credentials") || lowerMsg.includes("incorrect") || lowerMsg.includes("неверный email или пароль")) return "Неверный email-адрес или пароль";
    if (lowerMsg.includes("not found") || lowerMsg.includes("user not found")) return "Пользователь с таким email-адресом не найден";
    if (lowerMsg.includes("token expired") || lowerMsg.includes("invalid token") || lowerMsg.includes("expired")) return "Ссылка недействительна или устарела";

    // Если сообщение уже на русском и понятное, возвращаем как есть
    if (lowerMsg.includes("неверный") || lowerMsg.includes("пароль") || lowerMsg.includes("email")) {
        return message;
    }

    return "Что-то пошло не так. Попробуйте позже";
};
