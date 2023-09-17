import { ApiPromise, WsProvider } from '@polkadot/api';

import { logger, serviceParameters } from './service_parameters.mjs';


const EXIT_FAILURE = 1;
const MS_IN_SEC = 1_000;
const RETRIES = 2;

let apiPara = null;
let apiRelay = null;

export async function init() {
	const wsProviderRelay = new WsProvider(serviceParameters.wsUrlRelay);
	const wsProviderPara = new WsProvider(serviceParameters.wsUrlPara);

	apiRelay = await newApi(wsProviderRelay);
	apiPara = await newApi(wsProviderPara);
}

export async function getParachainEvents(blockHash: string) {
	const events = await withReconnectPara(async () => {
		return await apiPara.query.system.events.at(blockHash);
	});

	return events.toHuman();
}

export function relayCallDecode(hex: string) {
	return apiRelay.createType('Call', hex);
}

export async function relayBlockTime(hash: string) {
	return withReconnectRelay(async () => {
		return (await apiRelay.query.timestamp.now.at(hash)).toNumber();
	});
}

async function _getHeader() {
	return await apiRelay.rpc.chain.getHeader();
}

async function getHeader() {
	return await withReconnectRelay(_getHeader);
}

async function newApi(wsProvider: any) {
	return await ApiPromise.create({ provider: wsProvider });
}

const asyncTimeout = (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

async function fetchBlocks(
	fromBlock: number,
	toBlock: number,
	callback: { (blockNumber: number, blockHash: string, events: any): Promise<void>;
        (arg0: number, arg1: any, arg2: any): any; }
) {
	for (let i = fromBlock; i <= toBlock; ++i) {
		const hash = await withReconnectRelay(async () => {
			return await apiRelay.rpc.chain.getBlockHash(i);
		});
		const new_events = await withReconnectRelay(async () => {
			return await apiRelay.query.system.events.at(hash);
		});
		await callback(i, hash.toString(), new_events);
	}
}

function getXcm(
	events: { event: { method: string; section: string; data: { descriptor: { paraHead: string, paraId: number }; }[] }; }[],
	paraId: number,
) {
	const umpEvents = events.filter((ev: { event: { method: string; section: string; }; }) => {
		return ev.event.method == 'ExecutedUpward' && ev.event.section == 'ump';
	});
	if (umpEvents.length) {
		const candIncluded = events.find(
			(event) => {
				return event.event.method == 'CandidateIncluded' && event.event.section == 'paraInclusion' &&
                    event.event.data[0].descriptor.paraId == paraId;
			});
		if (candIncluded !== undefined) {
			return {
				'ump': umpEvents.map(ev => ev.event),
				'paraBlock': candIncluded.event.data[0].descriptor.paraHead
			};
		}
	}

	return null;
}

export function run(fromBlock: number, paraId: number, xcmCallback, errCallback, blockCallback) {
	let lastFiredBlock = fromBlock;
	let inProgress = false;

	const events = async (blockNumber: number, blockHash: string, events) => {
		try {
			const xcm = getXcm(events.toHuman(), paraId);
			if (xcm) {
				await xcmCallback(blockNumber, blockHash, xcm);
			}
		} catch(err) {
			await errCallback('PARSING_ERROR', err);
			logger.error('PARSING_ERROR:', err);
		}

		lastFiredBlock = blockNumber;
		if (blockNumber % 100 == 0) {
			logger.info('Processed block:', blockNumber);
		}
		await blockCallback(blockNumber, blockHash);
	};


	setInterval(async () => {
		if (inProgress) {
			return;
		}

		inProgress = true;
		const blockHeader = await getHeader();
		const blockNumber = blockHeader.number.toNumber();
		if (lastFiredBlock < blockNumber) {
			logger.info('Gap:', lastFiredBlock + 1, blockNumber, blockNumber - lastFiredBlock - 1);
			await fetchBlocks(lastFiredBlock + 1, blockNumber, events);
		}
		inProgress = false;
	}, MS_IN_SEC);
}


async function withReconnectRelay(func, ...args) {
	for (let retry = 0; retry < RETRIES; retry++) {
		try {
			return await func(...args);
		} catch (err) {
			logger.error(err);
			let reconnected = false;
			for (let attempt = 0; attempt < serviceParameters.apiRestartAttempts; ++attempt) {
				try {
					logger.info('Restaring relay api...');
					const wsProviderRelay = new WsProvider(serviceParameters.wsUrlRelay);
					apiRelay = await newApi(wsProviderRelay);
					reconnected = true;
					break;
				} catch (err) {
					logger.error(`Failed to restart the relay API. Waiting for ${serviceParameters.apiRestartDelay} seconds`);
					await asyncTimeout(serviceParameters.apiRestartDelay * MS_IN_SEC);
				}
			}
			if (!reconnected) {
				// After API_RESTART_ATTEMPTS failed shutdown the service
				logger.error(`Shutting down after ${serviceParameters.apiRestartAttempts} failed attempts`);
				process.exit(EXIT_FAILURE);
			}
		}
	}

	throw new Error('Relay RPC down');
}

async function withReconnectPara(func, ...args) {
	for (let retry = 0; retry < RETRIES; retry++) {
		try {
			return await func(...args);
		} catch (err) {
			logger.error(err);
			let reconnected = false;
			for (let attempt = 0; attempt < serviceParameters.apiRestartAttempts; ++attempt) {
				try {
					logger.info('Restaring the parachain api...');
					const wsProviderPara = new WsProvider(serviceParameters.wsUrlPara);
					apiPara = await newApi(wsProviderPara);
					reconnected = true;
					break;
				} catch (err) {
					logger.error(`Failed to restart the para API. Waiting for ${serviceParameters.apiRestartDelay} seconds`);
					await asyncTimeout(serviceParameters.apiRestartDelay * MS_IN_SEC);
				}
			}
			if (!reconnected) {
				// After API_RESTART_ATTEMPTS failed shutdown the service
				logger.error(`Shutting down after ${serviceParameters.apiRestartAttempts} failed attempts`);
				process.exit(EXIT_FAILURE);
			}
		}
	}

	throw new Error('Para RPC down');
}
