import assert from 'assert';
import log4js from 'log4js';
import web3Utils from 'web3-utils';


const DEFAULT_API_RESTART_DELAY = 60;
const DEFAULT_API_RESTART_ATTEMPTS = 5;
const DEFAULT_LOG_LEVEL = 'debug';
const DEFAULT_PROMETHEUS_METRICS_PORT = 9000;
const DEFAULT_PROMETHEUS_METRICS_PREFIX = 'xcm_';

const LOG_LEVELS = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'MARK', 'OFF'];

export const logger = log4js.getLogger();


class ServiceParameters {
	allowMessage: boolean;
	apiRestartAttempts: number;
	apiRestartDelay: number;
	controllerAddress: string;
	databaseUrl: string;
	initialBlock: number;
	paraId: number;
	prometheusMetricsPort: number;
	prometheusMetricsPrefix: string;
	tgBotToken: string;
	tgChatId: string;
	wsUrlPara: string;
	wsUrlRelay: string;

	constructor() {
		logger.info('Checking configuration parameters');

		logger.info('[ENV] GET \'LOG_LEVEL\'');
		const level = process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;
		assert.ok(this._isCorrectLogLevel(level), `Valid log levels: ${LOG_LEVELS}`);
		log4js.configure({
			appenders: {
				out: {
					type: 'stdout',
					layout: {
						type: 'pattern',
						pattern: '%[[%d] [%p] [%c]%] [%f{1}:%l:%o] %m'
					}
				}
			},
			categories: {
				default: { appenders: ['out'], level: level, enableCallStack: true },
			},
		});
		logger.info(`[ENV] 'LOG_LEVEL': ${logger.level}`);

		logger.info('[ENV] GET \'WS_URL_PARA\'');
		this.wsUrlPara = process.env.WS_URL_PARA;
		assert.ok(this.wsUrlPara, 'Not provided');
		logger.info(`[ENV] 'WS_URL_PARA': successfully got, contains ${this.wsUrlPara.length} symbols`);

		logger.info('[ENV] GET \'WS_URL_RELAY\'');
		this.wsUrlRelay = process.env.WS_URL_RELAY;
		assert.ok(this.wsUrlRelay, 'Not provided');
		logger.info(`[ENV] 'WS_URL_RELAY': successfully got, contains ${this.wsUrlRelay.length} symbols`);

		logger.info('[ENV] GET \'DATABASE_URL\'');
		this.databaseUrl = process.env.DATABASE_URL;
		assert.ok(this.databaseUrl, 'Not provided');
		logger.info(`[ENV] 'DATABASE_URL': successfully got, contains ${this.databaseUrl.length} symbols`);

		logger.info('[ENV] GET \'CONTROLLER_ADDRESS\'');
		this.controllerAddress = process.env.CONTROLLER_ADDRESS;
		assert.ok(this.controllerAddress, 'Not provided');
		this.controllerAddress = web3Utils.toChecksumAddress(this.controllerAddress);
		logger.info('[ENV] \'controller_ADDRESS\': ', this.controllerAddress);

		logger.info('[ENV] Get \'INITIAL_BLOCK_NUMBER\'');
		const initialBlock = process.env.INITIAL_BLOCK_NUMBER;
		assert.ok(initialBlock, 'Not provided');
		this.initialBlock = Number(initialBlock);
		logger.info('[ENV] \'INITIAL_BLOCK_NUMBER\': ', this.initialBlock);

		logger.info('[ENV] Get \'PARA_ID\'');
		const paraId = process.env.PARA_ID;
		assert.ok(paraId, 'Not provided');
		this.paraId = Number(paraId);
		logger.info('[ENV] \'PARA_ID\': ', this.paraId);

		logger.info('[ENV] Get \'API_RESTART_DELAY\'');
		this.apiRestartDelay = Number(process.env.API_RESTART_DELAY) || DEFAULT_API_RESTART_DELAY;
		logger.info('[ENV] \'API_RESTART_DELAY\': ', this.apiRestartDelay);

		logger.info('[ENV] Get \'API_RESTART_ATTEMPTS\'');
		this.apiRestartAttempts = Number(process.env.API_RESTART_ATTEMPTS) || DEFAULT_API_RESTART_ATTEMPTS;
		logger.info('[ENV] \'API_RESTART_ATTEMPTS\': ', this.apiRestartAttempts);

		logger.info('[ENV] Get \'PROMETHEUS_METRICS_PORT\'');
		this.prometheusMetricsPort = Number(process.env.PROMETHEUS_METRICS_PORT) || DEFAULT_PROMETHEUS_METRICS_PORT;
		assert.ok(this.prometheusMetricsPort > 1024, 'Must be greater than 1024');
		logger.info('[ENV] \'PROMETHEUS_METRICS_PORT\': ', this.prometheusMetricsPort);

		logger.info('[ENV] Get \'PROMETHEUS_METRICS_PREFIX\'');
		this.prometheusMetricsPrefix = process.env.PROMETHEUS_METRICS_PREFIX || DEFAULT_PROMETHEUS_METRICS_PREFIX;
		logger.info('[ENV] \'PROMETHEUS_METRICS_PREFIX\': ', this.prometheusMetricsPrefix);

		logger.info('[ENV] Get \'ALLOW_MESSAGE\'');
		this.allowMessage = !!process.env.ALLOW_MESSAGE;
		logger.info('[ENV] \'ALLOW_MESSAGE\': ', this.allowMessage);

		logger.info('[ENV] Get \'TG_BOT_TOKEN\'');
		this.tgBotToken = process.env.TG_BOT_TOKEN;
		if (this.allowMessage) {
			assert.ok(this.tgBotToken, 'Not provided');
			logger.info('[ENV] \'TG_BOT_TOKEN\': successfully got');
		} else {
			logger.info('[ENV] \'TG_BOT_TOKEN\': not provided');
		}

		logger.info('[ENV] Get \'TG_CHAT_ID\'');
		this.tgChatId = process.env.TG_CHAT_ID;
		if (this.allowMessage) {
			assert.ok(this.tgChatId, 'Not provided');
			logger.info('[ENV] \'TG_CHAT_ID\': successfully got');
		} else {
			logger.info('[ENV] \'TG_CHAT_ID\': not provided');
		}

		logger.info('Configuration parameters successfully checked');
	}

	_isCorrectLogLevel(logLevel: string): boolean {
		for (const level of LOG_LEVELS) {
			if (level.toLowerCase() == logLevel.toLowerCase()) {
				return true;
			}
		}

		return false;
	}
}

export const serviceParameters = new ServiceParameters();
