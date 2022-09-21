# Device Orientation Compass Demo

This repository contains the sourcecode for the geolocation API demo.

## Team

| Role | Name               |
| ---- | ------------------ |
| PO   | Patrick Mast       |
| DEV  | Martin Schuhfuß    |
| DEV  | Katherina Marcenko |

## Development

Have `node.js` and `npm` installed.
Install dependencies with:

```
npm install
```

Add a .env file with the content:

```
GOOGLE_MAPS_API_KEY=key
VITE_TAG_MANAGER_ID=key
```

Start dev server with

```
npm start
```

## Staging Deployment

```
npm run deploy:dev
```

Builds and deploys to the staging environment: https://storage.googleapis.com/storage.ubidev.net/deviceorientation-compass-demo/index.html

## Live Deployment

```
npm run deploy:prod
```

Builds and deploys to the live environment: https://demos.ubilabs.net/device-orientation/index.html
