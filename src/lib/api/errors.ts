/** Error normalizado de cualquier llamada a la API (formato del backend + fallos de red). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
}

const FALLBACKS: Record<number, string> = {
  400: 'Revisa los datos ingresados.',
  401: 'Tu sesión terminó. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró el recurso.',
  409: 'La operación entra en conflicto con el estado actual. Actualiza e inténtalo de nuevo.',
  429: 'Demasiados intentos. Espera un momento.',
  502: 'No se pudo contactar con el servidor.',
  503: 'El servicio no está disponible por ahora.',
};

/** Convierte una respuesta de error del backend en un ApiError con mensaje legible. */
export async function toApiError(response: Response): Promise<ApiError> {
  let message: string | undefined;
  let requestId: string | undefined;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const raw = (body as { message?: unknown }).message;
      if (typeof raw === 'string') message = raw;
      else if (Array.isArray(raw))
        message = raw
          .filter((m): m is string => typeof m === 'string')
          .join('. ');
      const id = (body as { requestId?: unknown }).requestId;
      if (typeof id === 'string') requestId = id;
    }
  } catch {
    // Cuerpo vacío o no JSON: se usa el mensaje genérico del estado.
  }
  return new ApiError(
    response.status,
    message || FALLBACKS[response.status] || 'Ocurrió un error inesperado.',
    requestId,
  );
}
