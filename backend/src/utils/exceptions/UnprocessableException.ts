import { HTTP_STATUS_CODE } from '../../constants';
import { HttpException } from './HttpException';

const DEFAULT_CODE = 'UNPROCESSABLE_CONTENT_EXCEPTION';
const DEFAULT_MESSAGE = 'Unprocessable content';

export class UnprocessableException extends HttpException {
    constructor(message = DEFAULT_MESSAGE) {
        super(HTTP_STATUS_CODE.UNPROCESSABLE, DEFAULT_CODE, message);
    }
}
