FROM python:3.13-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR /app/tripsync_proj

EXPOSE 8000

RUN echo 'alias pm="python manage.py"' >> /root/.bashrc

# 2 workers x 4 threads fits a t3.micro and keeps one slow Google call (up to 5 s) from
# stalling every other user; the logs go to stdout so `make backend-logs` shows requests;
# --forwarded-allow-ips '*' is safe because port 8000 is never published - only nginx reaches it
CMD ["gunicorn", "tripsync_proj.wsgi:application", "--bind", "0.0.0.0:8000", \
     "--workers", "2", "--threads", "4", "--timeout", "60", \
     "--forwarded-allow-ips", "*", "--access-logfile", "-", "--error-logfile", "-"]