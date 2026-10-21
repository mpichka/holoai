import { HTTP_STATUS_CODE } from '../../constants/httpStatusCode';
import { HttpException } from './HttpException';

const DEFAULT_CODE = 'NOT_FOUND_EXCEPTION';
const DEFAULT_MESSAGE = 'Entity not found';

export class NotFoundException extends HttpException {
    constructor(message = DEFAULT_MESSAGE) {
        super(HTTP_STATUS_CODE.NOT_FOUND, DEFAULT_CODE, message);
    }
}
