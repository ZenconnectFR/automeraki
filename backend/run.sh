cd ../frontend;
npm run build;
rm -rf ../backend/dist/;
mv dist/ ../backend/;
cd ../backend/;
uvicorn main:app --port 8000 --reload
