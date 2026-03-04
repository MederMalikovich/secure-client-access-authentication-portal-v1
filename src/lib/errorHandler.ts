export function getUserFriendlyError(error: any): string {
  // Log full details for debugging
  console.error('Application error:', error);

  if (!error) return 'Произошла неизвестная ошибка';

  const message = error?.message || String(error);

  // Auth errors
  if (message.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (message.includes('already registered')) return 'Пользователь с таким email уже существует';
  if (message.includes('JWT') || message.includes('token')) return 'Сессия истекла. Войдите снова';
  if (message.includes('Email not confirmed')) return 'Подтвердите email для входа';

  // DB constraint errors
  const code = error?.code;
  if (code === '23505') return 'Такая запись уже существует';
  if (code === '23503') return 'Невозможно удалить — есть связанные записи';
  if (code === '23502') return 'Заполните все обязательные поля';
  if (code === '42501') return 'Недостаточно прав для выполнения операции';

  // Network errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Ошибка сети. Проверьте подключение к интернету';
  }

  return 'Произошла ошибка. Попробуйте позже';
}
