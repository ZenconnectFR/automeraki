# AutoMeraki

Chrome extension to add templating to Meraki Dashboard.

## Project Setup

Install dependencies
```sh
pip install -r backend/requirements.txt
cd frontend
npm install
```

Run local server
```sh
cd backend
# on windows
bash run.sh
# on unix
./run.sh
```

### Compile and Hot-Reload for Development (App only)


```sh
npm run dev
```

### Compile for Development (App & extension)

```sh
npm run build
```
Reload the extension in the Chrome extension page.
