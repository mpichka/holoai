import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type winston from 'winston';

export async function runFfmpeg(
    base64Data: string,
    inputExt: string,
    outputExt: string,
    args: (inputPath: string, outputPath: string) => string[],
    action: string,
    logger?: winston.Logger,
): Promise<string | null> {
    const dir = await mkdtemp(join(tmpdir(), 'holoai-media-'));
    const inputPath = join(dir, `input.${inputExt}`);
    const outputPath = join(dir, `output.${outputExt}`);

    try {
        await writeFile(inputPath, Buffer.from(base64Data, 'base64'));

        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args(inputPath, outputPath));

            let stderr = '';
            ffmpeg.stderr.on('data', (chunk) => (stderr += chunk));
            ffmpeg.on('error', reject);
            ffmpeg.on('close', (code) =>
                code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)),
            );
        });

        return (await readFile(outputPath)).toString('base64');
    } catch (err) {
        if (logger) logger.warn(`Cannot ${action} file: ${err}`);
        return null;
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

export async function trimToFirstSeconds(
    base64Data: string,
    mimeType: string,
    maxLength: number = 60,
): Promise<string | null> {
    const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'bin';

    return runFfmpeg(
        base64Data,
        ext,
        ext,
        (inputPath, outputPath) => ['-y', '-i', inputPath, '-t', String(maxLength), '-c', 'copy', outputPath],
        'trim',
    );
}

export async function convertToMp3(base64Data: string, mimeType: string): Promise<string | null> {
    const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'ogg';

    return runFfmpeg(
        base64Data,
        ext,
        'mp3',
        (inputPath, outputPath) => ['-y', '-i', inputPath, outputPath],
        'convert to mp3',
    );
}
