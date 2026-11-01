export class SuccessDto {
    static format() {
        return {
            success: true,
        } as const;
    }
}
