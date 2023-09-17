import TgBot from 'node-telegram-bot-api';

import { logger } from './service_parameters.mjs';


export class Bot {
	bot: TgBot | null;
	chatId: string;

	constructor(token: string, chatId: string, allowMessage: boolean) {
		if (allowMessage) {
			this.bot = new TgBot(token, {polling: true});
			this.chatId = chatId;
			this.bot.on('message', (msg: { chat: { id: number; }; }) => {
				logger.info(msg.chat.id);
			});
		} else {
			this.bot = null;
		}
	}

	async sendMessage(message: string) {
		if (this.bot) {
			logger.debug('Sending a message');
			await this.bot.sendMessage(this.chatId, message);
			logger.debug('Message sent');
		} else {
			logger.info('Not sending a message: \'allowMessage\' is false');
			logger.debug('The message: ', message);
		}
	}
}
