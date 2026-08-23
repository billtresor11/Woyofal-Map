/** Erreur metier renvoyee telle quelle au client, avec un message en francais. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'BAD_REQUEST',
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(`${what} introuvable.`, 404, 'NOT_FOUND');
