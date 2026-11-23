import { HTTP_STATUS_CODE } from '../../constants';
import { HttpException } from './HttpException';

const DEFAULT_CODE = 'INTERNAL_SERVER_ERROR_EXCEPTION';
const DEFAULT_MESSAGE = 'Internal server error';

export class InternalServerException extends HttpException {
    constructor(message = DEFAULT_MESSAGE) {
        super(HTTP_STATUS_CODE.INTERNAL_ERROR, DEFAULT_CODE, message);
    }
}
