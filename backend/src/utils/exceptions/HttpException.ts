export class HttpException extends Error {
    httpStatusCode: number;
    errorCode: string;
    message: string;
    constructor(httpStatusCode: number, errorCode: string, message: string) {
        super();

        this.httpStatusCode = httpStatusCode;
        this.errorCode = errorCode;
        this.message = message;
    }
}
