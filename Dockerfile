FROM node:19

WORKDIR /xcm-monitor
COPY . .

RUN npm install

EXPOSE 9000

CMD [ "bash", "run.sh" ]
