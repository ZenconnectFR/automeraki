FROM python:3.12-alpine

# Set the working directory

WORKDIR /app

# Copy the source code to the working directory

COPY . /app

# Install the dependencies

RUN pip install --no-cache-dir -r requirements.txt

# Expose the port the app runs on

EXPOSE 8080

# Run the application

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
