FROM node:12

# Build variables
ARG PORT
ENV PORT ${PORT:-3000} 

WORKDIR /app

# Copy dependency files
COPY  package.json \
      yarn.lock ./

# Copy service to /app
COPY . ./

RUN yarn install

EXPOSE ${PORT}
RUN echo Exposed port=$PORT

CMD [ "npm", "start" ]
