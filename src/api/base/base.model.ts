export type ApiBaseSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiBaseErrorResponse = {
  success: false;
  error: string;
};

export type ApiBaseResponse<T> = ApiBaseSuccessResponse<T> | ApiBaseErrorResponse;

export type ApiMessageResponse = {
  message: string;
};
