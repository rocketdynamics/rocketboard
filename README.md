Kvasir QA Portal
================

Landing page that lists the available QA environments

The front-end is a React app communicating with a Go backend.


## Developing

`make build` will build a production-ready Docker image, with both backend and frontend.

To hack on the front-end:

```
cd frontend
yarn install
yarn start
```

This will start a development server, with the backend simulated from the `public` subdirectory.


## Functional testing

The docker-compose setup in `test` uses:
- the above-build Docker image as backend and frontend
- a static JSON file as the Rancher-Metadata service.

```
cd test
VERSION=fa93072 docker-compose up -d
```
