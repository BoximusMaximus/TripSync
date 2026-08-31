FROM python:3.13-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR /app/tripsync_proj

EXPOSE 8000

RUN echo 'alias pm="python manage.py"' >> /root/.bashrc

CMD ["gunicorn", "tripsync_proj.wsgi:application", "--bind", "0.0.0.0:8000"]