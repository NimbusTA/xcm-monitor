import PromClient, { Counter, Gauge } from 'prom-client';


export class MetricsExporter {
	prefix: string;

	failedXcm: Counter<string>;
	lastFailedBlock: Gauge<string>;
	lastProcessedBlock: Gauge<string>;
	serviceErrors: Counter<string>;

	constructor(prefix: string) {
		this.prefix = prefix;
		const collectDefaultMetrics = PromClient.collectDefaultMetrics;
		collectDefaultMetrics({ prefix: this.prefix });

		this.failedXcm = new PromClient.Counter({
			name: this._metricName('failed_xcm_cnt'),
			help: 'amount of falied xcm transacts',
		});

		this.serviceErrors = new PromClient.Counter({
			name: this._metricName('service_error_cnt'),
			help: 'amount of servive errors',
			labelNames: ['name']
		});

		this.lastProcessedBlock = new PromClient.Gauge({
			name: this._metricName('last_processed_blk_num'),
			help: 'last processed block num',
		});

		this.lastFailedBlock = new PromClient.Gauge({
			name: this._metricName('last_faled_blk_num'),
			help: 'last block num with failed xcm',
		});
	}

	_metricName(name: string): string {
		return this.prefix + name;
	}
}
