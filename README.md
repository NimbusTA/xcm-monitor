# nimbus-xcm-monitor
Service that monitors relay chain and parachain blocks and events. 

It alerts if one of the following XCM messages from the Controller is failed:
1) the section is `xcmTransactor` and the method is `TransactedDerivative`;
2) the section is `xTokens` and the method is `TransferredWithFee`.

Alerting ways:
- send a message in a Telegram chat;
- Prometheus metrics at the `/metrics` url.


## Setup 
```shell
npm i
```


## Run
The service receives its configuration parameters from environment variables. Export required parameters from the list below and start the service:
```shell
bash run.sh
```


## Configuration parameters
#### Required
* `CONTROLLER_ADDRESS` - The address of the Controller contract. Example: `0x000000000000000000000000000000000000dEaD`.
* `DATABASE_URL` - The URL to the database. Example: `postgres://admin:1234@localhost:5432/xcm-monitor`.
* `INITIAL_BLOCK_NUMBER` - The number of the block from which the service should start syncing if the database is empty.
* `PARA_ID` - the ID of the parachain. Example: `1,000`.
* `WS_URL_PARA` - The Websocket URL of the parachain node. Example: `ws://localhost:10059/`.
* `WS_URL_RELAY` - The Websocket URL of the relay chain node. Example: `ws://localhost:10059/`.

#### Optional
* `API_RESTART_ATTEMPTS` - The number of attempts for the polkadot API to reconnect. The default value is `5`.
* `API_RESTART_DELAY` - Waiting time in seconds when trying to reconnect. The default value is `60`.
* `LOG_LEVEL` - The logging level of the logging module: `DEBUG`, `INFO`, `WARNING`, `ERROR` or `CRITICAL`. The default level is `INFO`.
* `PROMETHEUS_METRICS_PORT` - The port at which Prometheus metrics will be exposed. The default value is `9000`.
* `PROMETHEUS_METRICS_PREFIX` - The default value is `xcm_`.

#### Telegram Bot
* `ALLOW_MESSAGE` - If the value is `true`, the service tries to send messages in Telegram.

If the `ALLOW_MESSAGE` env is set to `true` and any of the following values are not provided, the service doesn't start:
* `TG_BOT_TOKEN` - Telegram bot token.
* `TG_CHAT_ID` - Telegram chat id.


## Prometheus metrics

Prometheus exporter provides the following metrics.

| name                                        | description                                  |
|---------------------------------------------|----------------------------------------------|
| **failedXCM**                <br> *Counter* | Number of failed XCM transactions            |
| **lastFailedBlock**          <br> *Gauge*   | The number of the last block with failed XCM |
| **lastProcessedBlock**       <br> *Gauge*   | The number of the last processed block       |
| **serviceErrors**            <br> *Counter* | Number of service errors                     |
