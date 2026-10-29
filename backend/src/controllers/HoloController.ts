import type { Message } from 'node-telegram-bot-api';
import type winston from 'winston';
import { CHARACTER_NAMES, COMMAND, COMMANDS } from '../constants';
import type { FileDescriberService } from '../services/describer';
import type { HoloAIService } from '../services/holo/HoloAIService';
import type { FullMessageModel, HoloService } from '../services/holo/HoloService';
import type { TriggerService } from '../services/trigger';
import { TRIGGER } from '../services/trigger/constants';
import type { Trigger } from '../services/trigger/types';
import { AUDIO_TYPES } from '../utils/db/repositories';
import type { Container } from '../utils/di';
import { CHAT_ACTION, type ChatContext, type TelegramBot } from '../utils/tg';

const ACTION_RESEND_TIMEOUT = 4500; // 4,5s

export class HoloController {
    holoService: HoloService;
    holoAIService: HoloAIService;
    triggerService: TriggerService;
    fileDescriberService: FileDescriberService;
    tg: TelegramBot;
    logger: winston.Logger;

    constructor(container: Container) {
        this.holoService = container.HoloService;
        this.holoAIService = container.HoloAIService;
        this.triggerService = container.TriggerService;
        this.fileDescriberService = container.FileDescriberService;
        this.tg = container.TelegramBot;
        this.logger = container.LoggerFactory.createLogger('Holo');
    }

    async handleTgMessage(ctx: ChatContext) {
        this.logMessage(ctx);

        if (ctx.isOwnBot) return; // don't react to own messages

        await Promise.all([this.createMessage(ctx.message), this.createMessage(ctx.message.reply_to_message)]);

        if (ctx.isEdited) return; // don't react to edit messages

        const [message, repliedMessage] = await Promise.all([
            this.holoService.getFullMessage(ctx.chatId, ctx.message.message_id),
            this.holoService.getFullMessage(
                ctx.message.reply_to_message?.chat.id,
                ctx.message.reply_to_message?.message_id,
            ),
        ]);

        if (message && repliedMessage) {
            await this.holoService.markAsReply(message.id, repliedMessage.id);
            message.replyToId = repliedMessage.id;
        }

        if (!message) return; // skip broken messages

        const trigger = this.matchTrigger(ctx);

        if (!trigger) return; // skip unrelated messages

        await this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
        const typing = setInterval(() => {
            this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
        }, ACTION_RESEND_TIMEOUT);

        let reply;
        try {
            reply = await this.generateReply(trigger, message, repliedMessage);
        } finally {
            this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
            clearInterval(typing);
        }

        await this.createReply(reply);
    }

    logMessage(ctx: ChatContext) {
        let template = 'Incoming message.';

        template += ctx.chatId ? ` chat:${ctx.chatId}` : '';
        template += ctx.message.message_id ? `, message:${ctx.message.message_id}` : '';
        template += ctx.message.message_thread_id ? `, thread:${ctx.message.message_thread_id}` : '';
        template += ctx.message.from?.username ? ` from user "${ctx.message.from?.username}"` : '';

        if (ctx.message.reply_to_message) {
            const reply = ctx.message.reply_to_message;

            template += '. In response to';
            template += reply.chat.id ? ` chat:${reply.chat.id}` : '';
            template += reply.message_id ? ` message:${reply.message_id}` : '';
            template += reply.message_thread_id ? ` thread:${reply.chat.id}` : '';
            template += reply.from?.username ? ` of user "${reply.from?.username}"` : '';
        }

        this.logger.info(template);
    }

    async createMessage(tgMessage?: Message) {
        if (!tgMessage) return;

        const [user, chat] = await Promise.all([
            this.holoService.upsertTgUser(tgMessage.from),
            this.holoService.upsertTgChat(tgMessage.chat),
        ]);

        if (!user || !chat) return;

        const message = await this.holoService.upsertMessage(tgMessage, {
            chat_id: chat.id,
            user_id: user.id,
        });

        if (!message) return;

        const attachmentOptions = {
            message_id: message.id,
            media_group_id: tgMessage.media_group_id,
            caption: tgMessage.caption?.trim(),
        };

        if (tgMessage.audio) {
            await this.holoService.createAudioAttachment(tgMessage.audio, attachmentOptions);
        }

        if (tgMessage.voice) {
            await this.holoService.createVoiceAttachment(tgMessage.voice, attachmentOptions);
        }

        if (tgMessage.photo && tgMessage.photo.length) {
            const largest = tgMessage.photo.reduce((acc, curr) =>
                (curr.file_size || 0) > (acc.file_size || 0) ? curr : acc,
            );

            await this.holoService.createPhotoAttachment(largest, attachmentOptions);
        }

        if (tgMessage.animation) {
            await this.holoService.createAnimationAttachment(tgMessage.animation, attachmentOptions);
        }

        if (tgMessage.live_photo) {
            await this.holoService.createLivePhotoAttachment(tgMessage.live_photo, attachmentOptions);
        }

        if (tgMessage.sticker) {
            let caption: string | undefined = attachmentOptions.caption;

            if (caption) {
                caption = (caption + ' ' + tgMessage.sticker?.emoji).trim();
            } else {
                caption = tgMessage.sticker?.emoji;
            }

            await this.holoService.createStickerAttachment(tgMessage.sticker, {
                ...attachmentOptions,
                caption,
            });
        }

        if (tgMessage.video) {
            await this.holoService.createVideoAttachment(tgMessage.video, attachmentOptions);
        }

        if (tgMessage.video_note) {
            await this.holoService.createVideoNoteAttachment(tgMessage.video_note, attachmentOptions);
        }
    }

    matchTrigger(ctx: ChatContext): Trigger | undefined {
        const message = ctx.message.text;

        const commandTrigger = this.triggerService.matchCommand(message, this.tg.botName, COMMANDS);

        if (commandTrigger) return commandTrigger;

        if (ctx.isReplyToBot) return { reason: TRIGGER.REPLY };

        const mentionTrigger = this.triggerService.matchMention(message, this.tg.botName);

        if (mentionTrigger) return mentionTrigger;

        const nameTrigger = this.triggerService.matchCharacterName(message, CHARACTER_NAMES);

        if (nameTrigger) return nameTrigger;
    }

    async createReply(reply: any) {
        // TODO:
        console.log(`\n\n${JSON.stringify(reply)}\n\n`);
    }

    async generateReply(trigger: Trigger, message: FullMessageModel, reply?: FullMessageModel | null) {
        this.logger.info(`Generating reply for the ${message.id} for reason: ${trigger.reason}`);

        if (trigger.command) {
            switch (trigger.command) {
                case COMMAND.DELETE: {
                    if (reply && reply.user.tgId === this.tg.botId) {
                        try {
                            await this.tg.deleteMessage(reply.chat.tgId, reply.messageTgId);

                            await this.holoService.deleteMessage(reply.id);
                        } catch (error) {
                            this.logger.warn(
                                `Couldn't delete the message due error. chatId:${reply.chat.tgId}, messageId:${reply.messageTgId}.\nError: ${error}`,
                            );

                            const aiRes = await this.holoAIService.couldNotDeleteOldReply();

                            if (aiRes) {
                                await this.tg.sendMessage(aiRes, message.chat.tgId, {
                                    messageThreadId: message.threadTgId,
                                    replyToMessageId: message.messageTgId,
                                });
                            }
                        }

                        break;
                    }

                    const aiRes = await this.holoAIService.couldNotDeleteReply();

                    if (aiRes) {
                        await this.tg.sendMessage(aiRes, message.chat.tgId, {
                            messageThreadId: message.threadTgId,
                            replyToMessageId: message.messageTgId,
                        });
                    }

                    break;
                }
                case COMMAND.SUMMARIZE: {
                    break;
                }
                case COMMAND.TRANSCRIBE: {
                    let aiRes = await this.holoAIService.taskAcknowledge();

                    let tgMessage;
                    if (aiRes) {
                        tgMessage = await this.tg.sendMessage(aiRes, message.chat.tgId, {
                            messageThreadId: message.threadTgId,
                            replyToMessageId: message.messageTgId,
                        });
                    }

                    if (!tgMessage) {
                        this.logger.error('Cannot send message to tg');
                        return;
                    }

                    if (reply) {
                        const audioAttachments = reply.attachments.filter((file) => AUDIO_TYPES.includes(file.type));

                        if (!audioAttachments.length) {
                            const aiRes = await this.holoAIService.couldNotTranscribe();

                            if (aiRes) {
                                await this.tg.editMessage(aiRes, tgMessage.chat.id, tgMessage?.message_id);
                            }

                            break;
                        }

                        const transcriptions = [];
                        for (const audio of audioAttachments) {
                            const attachment = await this.fileDescriberService.describe(audio);
                            transcriptions.push(attachment?.ai_description);
                        }

                        const aiRes = await this.holoAIService.generateTranscribeTemplateResponse();

                        if (aiRes) {
                            const res = this.fillTemplate(aiRes, {
                                username: reply.user.userName || reply.user.firstName || 'користувача',
                                transcription: transcriptions.join('\n\n'),
                            });

                            await this.tg.editMessage(res, tgMessage.chat.id, tgMessage?.message_id);
                        }
                    }

                    aiRes = await this.holoAIService.couldNotTranscribe();

                    if (aiRes) {
                        await this.tg.editMessage(aiRes, tgMessage.chat.id, tgMessage?.message_id);
                    }

                    break;
                }
                case COMMAND.TRANSLATE: {
                    break;
                }
            }
        } else {
            // const commands = await this.holoAIService.defineCommand(message.text);
        }
    }

    // TODO: move to the utils when I'll more than one template helper
    private fillTemplate(template: string, values: Record<string, string>): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
    }
}
