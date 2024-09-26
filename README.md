# AutoMeraki

Chrome extension to add templating to Meraki Dashboard.

## Project Setup

Install dependencies
```sh
pip install -r requirement.txt
cd AutoMeraki
npm install
```

Run local server
```sh
cd test-backend
uvicorn test-back:app --port 8000 --reload
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
