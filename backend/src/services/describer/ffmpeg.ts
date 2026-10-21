import { spawn } from 'node:child_process';
import type winston from 'winston';

const MAX_INPUT_BYTES = 50 * 1024 * 1024; // 50MB

// MIME subtype -> ffmpeg muxer name
const FORMAT_BY_SUBTYPE: Record<string, string> = {
    mpeg: 'mp3',
    mp3: 'mp3',
    ogg: 'ogg',
    opus: 'ogg',
    wav: 'wav',
    wave: 'wav',
    'x-wav': 'wav',
    flac: 'flac',
    'x-flac': 'flac',
    webm: 'webm',
    mp4: 'mp4',
    'x-m4a': 'ipod',
    aac: 'adts',
    quicktime: 'mov',
    'x-matroska': 'matroska',
};

const formatOf = (mimeType: string): string | null => {
    const subtype = mimeType.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
    return subtype ? FORMAT_BY_SUBTYPE[subtype] : null;
};

export async function runFfmpeg(
    base64Data: string,
    args: string[],
    action: string,
    logger?: winston.Logger,
): Promise<string | null> {
    try {
        const input = Buffer.from(base64Data, 'base64');

        if (input.length > MAX_INPUT_BYTES) {
            throw new Error(`input too large (${input.length} bytes)`);
        }

        const output = await new Promise<Buffer>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            const chunks: Buffer[] = [];
            let stderr = '';

            ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
            ffmpeg.stderr.on('data', (chunk) => (stderr += chunk));
            ffmpeg.on('error', reject);
            ffmpeg.on('close', (code) =>
                code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)),
            );

            // ffmpeg may exit early (bad input); ignore EPIPE so it surfaces via 'close'
            ffmpeg.stdin.on('error', () => {});
            ffmpeg.stdin.end(input);
        });

        return output.toString('base64');
    } catch (err) {
        logger?.warn(`Cannot ${action} file: ${err}`);
        return null;
    }
}

export async function trimToFirstSeconds(
    base64Data: string,
    mimeType: string,
    maxLength = 60,
    logger?: winston.Logger,
): Promise<string | null> {
    const format = formatOf(mimeType);
    if (!format) {
        logger?.warn(`Cannot trim file: unsupported mime type ${mimeType}`);
        return null;
    }

    return runFfmpeg(
        base64Data,
        [
            // If probing misdetects the input, add: '-f', <input demuxer>,
            '-i',
            'pipe:0',
            '-t',
            String(maxLength),
            '-c',
            'copy',
            '-movflags',
            'frag_keyframe+empty_moov', // ignored by non-mp4 muxers
            '-f',
            format,
            'pipe:1',
        ],
        'trim',
        logger,
    );
}

export function convertToMp3(base64Data: string, logger?: winston.Logger) {
    return runFfmpeg(base64Data, ['-i', 'pipe:0', '-f', 'mp3', 'pipe:1'], 'convert to mp3', logger);
}
