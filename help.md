sudo docker build -t xml-processor .
docker run --rm -v $(pwd)/output:/app/output xml-processor