from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit
import threading
import random
import time

app = Flask(__name__)
socketio = SocketIO(app)

tasks = {}
task_counter = 0

def background_task():
    """A background thread that simulates task updates."""
    while True:
        task_id = str(random.randint(1000, 9999))
        task_progress = 0
        tasks[task_id] = {'id': task_id, 'status': 'Running', 'progress': task_progress}
        while task_progress < 100:
            time.sleep(1)  # Simulate task processing time
            task_progress += random.randint(1, 10)
            task_progress = min(task_progress, 100)
            tasks[task_id]['progress'] = task_progress
            socketio.emit('task_update', {'id': task_id, 'progress': task_progress, 'status': 'Running'})
        tasks[task_id]['status'] = 'Completed'
        socketio.emit('task_update', {'id': task_id, 'progress': 100, 'status': 'Completed'})

@app.route('/')
def index():
    return render_template('dashboard.html')

@socketio.on('connect')
def on_connect():
    print('Client connected')

@socketio.on('disconnect')
def on_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    threading.Thread(target=background_task).start()
    socketio.run(app, debug=True)
