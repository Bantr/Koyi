FROM node:12

# Create app directory
WORKDIR /opt/bantr

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .

RUN npm run build

CMD [ "node", "dist/main.js" ]