# Session Terminal live relay (relay/server.py): Python standard library only, no packages to install.
FROM python:3.12-slim
WORKDIR /app
COPY relay/server.py /app/server.py
ENV PYTHONUNBUFFERED=1
CMD ["python", "server.py"]
