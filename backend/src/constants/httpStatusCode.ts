export const HTTP_STATUS_CODE = Object.freeze({
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    UNPROCESSABLE: 422,
    INTERNAL_ERROR: 500,
});

export type HttpStatusCode = keyof typeof HTTP_STATUS_CODE;
