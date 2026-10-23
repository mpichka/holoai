import { HTTP_STATUS_CODE } from '../../constants';
import { HttpException } from './HttpException';

const DEFAULT_CODE = 'FORBIDDEN_EXCEPTION';
const DEFAULT_MESSAGE = 'Forbidden';

export class ForbiddenException extends HttpException {
    constructor(message = DEFAULT_MESSAGE) {
        super(HTTP_STATUS_CODE.FORBIDDEN, DEFAULT_CODE, message);
    }
}
