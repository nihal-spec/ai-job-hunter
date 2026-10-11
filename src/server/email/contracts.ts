export interface EmailProvider {
  send(input: { to: string; subject: string; text: string; html?: string }): Promise<void>;
}

export class EmailProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
