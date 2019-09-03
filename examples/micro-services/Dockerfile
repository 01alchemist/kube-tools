FROM node:12

# Build variables
ENV PORT=8080

WORKDIR /app

# Copy dependency files
COPY  package.json \
      yarn.lock ./

# Copy service to /app
COPY . ./

RUN yarn install

EXPOSE ${PORT}

CMD [ "npm", "start" ]
