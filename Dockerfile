FROM node:8.15-alpine

RUN mkdir -p /src/
COPY ./ /src/
WORKDIR /src/

RUN apk add alpine-sdk make git gcc python
RUN npm install

VOLUME /src/creds

EXPOSE 8081

CMD ["npm", "start"]
ENTRYPOINT ["npm", "start"]
