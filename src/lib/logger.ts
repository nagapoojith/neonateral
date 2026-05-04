const isDev = import.meta.env.DEV;

export const logError = (context: string, _error?: unknown): void => {
  if (isDev) {
    console.error(context, _error);
  } else {
    console.error(context);
  }
};
