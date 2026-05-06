export type I18nResponse = string;

export type ActionResult = {
  isOk: boolean;
  message: string;
};

export type ApiErrorResponse = {
  detail: string;
};

/** Server-side error delivered through the WebSocket protocol. */
export type ServerErrorData = {
  code: string | null;
  message: string | null;
};
