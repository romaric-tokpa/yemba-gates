"""
Configuration Gunicorn pour le déploiement production
Usage: gunicorn -c gunicorn.conf.py main:app
"""
import multiprocessing
import os

# Bind
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8000')}"

# Workers
# Recommandation: (2 x CPU) + 1
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50

# Timeout
timeout = 120
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "recrutement-api"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (optionnel - généralement géré par le reverse proxy)
# keyfile = None
# certfile = None

# Hooks
def on_starting(server):
    """Appelé juste avant le fork des workers"""
    pass

def on_reload(server):
    """Appelé lors d'un reload"""
    pass

def worker_int(worker):
    """Appelé quand un worker reçoit SIGINT ou SIGQUIT"""
    pass

def worker_abort(worker):
    """Appelé quand un worker reçoit SIGABRT"""
    pass

def pre_fork(server, worker):
    """Appelé juste avant le fork d'un worker"""
    pass

def post_fork(server, worker):
    """Appelé juste après le fork d'un worker"""
    pass

def post_worker_init(worker):
    """Appelé juste après l'initialisation d'un worker"""
    pass

def worker_exit(server, worker):
    """Appelé juste après la sortie d'un worker"""
    pass

def nworkers_changed(server, new_value, old_value):
    """Appelé quand le nombre de workers change"""
    pass

def on_exit(server):
    """Appelé juste avant la sortie du master"""
    pass
