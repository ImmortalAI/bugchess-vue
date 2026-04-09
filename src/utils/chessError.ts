export class ChessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChessError';
  }
}
