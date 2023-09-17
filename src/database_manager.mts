import pg from 'pg';

import { logger } from './service_parameters.mjs';


export class DatabaseManager {
	rowExists: boolean;
	pgClient: pg.Client;

	constructor(databaseUrl: string) {
		this.pgClient = new pg.Client(databaseUrl);
		this.pgClient.connect().catch((err) => {
			logger.error('Failed to connect to the database: ', err);
		});
		this.rowExists = false;
	}

	async getLastBlock(): Promise<number> {
		logger.debug('Call \'getLastBlock\'');
		const query = await this.pgClient.query('SELECT block FROM last_block;');
		const blockNumber = query.rows[0].block;
		this.rowExists = true;

		return blockNumber;
	}

	async updateLastBlock(blockNumber: number) {
		if (this.rowExists) {
			await this.pgClient.query('UPDATE last_block SET block = $1;', [blockNumber]);
		} else {
			logger.debug('Call \'updateLastBlock\'');
			await this.pgClient.query('INSERT INTO last_block VALUES($1);', [blockNumber]);
		}
	}
}
