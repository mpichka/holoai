import { HTTP_STATUS_CODE } from '../../constants';
import { HttpException } from './HttpException';

const DEFAULT_CODE = 'BAD_REQUEST_EXCEPTION';
const DEFAULT_MESSAGE = 'Bad request';

export class BadRequestException extends HttpException {
    constructor(message = DEFAULT_MESSAGE) {
        super(HTTP_STATUS_CODE.BAD_REQUEST, DEFAULT_CODE, message);
    }
}
