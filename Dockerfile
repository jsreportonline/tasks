FROM node:4.4
MAINTAINER Jan Blaha
EXPOSE 3000

RUN apt-get update && apt-get install -y sudo
RUN npm install npm -g

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

EXPOSE 3000
CMD [ "node", "index.js" ]