import PromClient from 'prom-client';
import express from 'express';

import { Bot } from './bot.mjs';
import { DatabaseManager } from './database_manager.mjs';
import { MetricsExporter } from './metrics_exporter.mjs';
import { run, getParachainEvents, init, relayCallDecode, relayBlockTime } from './monitor.mjs';
import { logger, serviceParameters } from './service_parameters.mjs';


const metricsServer = express();


function getFailed(xcm: { ump: any[]; }) {
	return xcm.ump.filter((ev: { data: any[]; }) => {
		return !('Complete' in ev.data[1]);
	});
}

function blockLink(nodeUrl: string, blockHash: string) {
	return `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(nodeUrl)}#/explorer/query/${blockHash}`;
}

function getOurXcms(events: { event: { method: string; section: string; data: string[]; }; }[]):
	{ event: { method: string; section: string; data: string[]; }; }[] {
	return events.filter((ev: { event: { method: string; section: string; data: string[]; }; }) => {
		return (ev.event.method == 'TransactedDerivative' && ev.event.section == 'xcmTransactor' &&
                ev.event.data[0] == serviceParameters.controllerAddress) ||
            (ev.event.method == 'TransferredWithFee' && ev.event.section == 'xTokens' &&
                ev.event.data[0] == serviceParameters.controllerAddress) ;
	});
}

function decodeCalls(xcm: any[]) {
	return xcm.map(ev => {
		if (ev.event.method == 'TransactedDerivative') {
			const decodedCall = relayCallDecode(ev.event.data[2]);
			const asDerivativeIndex = decodedCall.args[1].args[0].toHuman();
			const innerCall = decodedCall.args[1].args[1].toHuman();
			return {
				method: innerCall.method,
				args: innerCall.args,
				asDerivativeIdx: asDerivativeIndex
			};
		} else if (ev.event.method == 'TransferredWithFee') {
			return {
				method: 'xtoken.transfer_with_fee',
			};
		}
	});
}

metricsServer.get('/metrics', async (req, res) => {
	try {
		res.set('Content-Type', PromClient.register.contentType);
		res.end(await PromClient.register.metrics());
	} catch (err) {
		logger.error(err);
		res.status(500).end(err);
	}
});


(async () => {
	const bot = new Bot(serviceParameters.tgBotToken, serviceParameters.tgChatId, serviceParameters.allowMessage);
	await init();
	const dbManager = new DatabaseManager(serviceParameters.databaseUrl);
	const metricsExporter = new MetricsExporter(serviceParameters.prometheusMetricsPrefix);
	let lastBlock: number;
	try {
		lastBlock = await dbManager.getLastBlock();
	} catch {
		lastBlock = serviceParameters.initialBlock;
	}

	run(lastBlock, serviceParameters.paraId,
		async (blockNumber: number, blockHash: string, xcm) => {
			const failed = getFailed(xcm);
			logger.info(failed);
			const xcmOur = getOurXcms(await getParachainEvents(xcm.paraBlock));

			let decodedCalls = null;
			let calls = 'Failed to decode calls';
			try {
				decodedCalls = decodeCalls(xcmOur);
				calls = '';
				decodedCalls.forEach((call: { as_derivative_idx: any; method: any; args: any; }) => {
					calls += '============================================\n'
                        + `sender idx: ${call.as_derivative_idx}\n`
                        + `method:     ${call.method}\n`
                        + `args:       ${JSON.stringify(call.args)}\n`
                        + '============================================\n';
				});
			} catch (err) {
				logger.error(err);
			}

			const ts = await relayBlockTime(blockHash);
			const time = new Date(ts).toUTCString();

			if (failed.length && xcmOur.length) {
				await bot.sendMessage(
					'FAILED XCM:\n' +
                    `Time: ${time}\n` +
                    `Relay blk num: ${blockNumber}\n` +
                    `Relay blk hash: [${blockHash}](${blockLink(serviceParameters.wsUrlRelay, blockHash)})\n` +
                    `Para blk hash: [${xcm.para_block}](${blockLink(serviceParameters.wsUrlPara, xcm.paraBlock)})\n` +
                    `Decoded calls: \`\`\`\n${calls}\`\`\``,
				);

				metricsExporter.failedXcm.inc(1);
				metricsExporter.lastFailedBlock.set(blockNumber);

				logger.info(
					blockNumber, blockHash, JSON.stringify(xcm), JSON.stringify(xcmOur), JSON.stringify(decodedCalls));
			}
		},
		async (errName: string, err: any) => {
			logger.error(errName, err);
			metricsExporter.serviceErrors.labels(errName).inc(1);
		},
		async (blockNumber: number) => {
			await dbManager.updateLastBlock(blockNumber);
			metricsExporter.lastProcessedBlock.set(blockNumber);
		}
	);

	metricsServer.listen(serviceParameters.prometheusMetricsPort);
})()
	.then()
	.catch(logger.error);
