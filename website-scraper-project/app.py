from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import threading
import time
import random

app = Flask(__name__)
socketio = SocketIO(app)

tasks = {}
task_counter = 0

def simulate_task_progress():
    """Simulates task progress for demonstration purposes."""
    while True:
        task_id = str(task_counter)
        task_progress = 0
        tasks[task_id] = {'id': task_id, 'status': 'Running', 'progress': task_progress}
        task_counter += 1
        
        # Simulate task progress
        while task_progress < 100:
            time.sleep(random.randint(1, 3))  # Random delay to simulate task processing time
            task_progress += random.randint(5, 25)  # Random progress
            task_progress = min(task_progress, 100)
            tasks[task_id]['progress'] = task_progress
            tasks[task_id]['status'] = 'Running'
            socketio.emit('task_update', {'id': task_id, 'progress': task_progress, 'status': 'Running'}, namespace='/')

        # Mark task as completed
        tasks[task_id]['status'] = 'Completed'
        socketio.emit('task_update', {'id': task_id, 'progress': 100, 'status': 'Completed'}, namespace='/')
        time.sleep(5)  # Wait a bit before starting a new task

@app.route('/')
def index():
    """Serve the index HTML file."""
    return render_template('dashboard.html')

@socketio.on('connect', namespace='/')
def test_connect():
    """Handle client connections to the WebSocket."""
    print('Client connected')
    emit('response', {'message': 'Connected to server'})

@socketio.on('disconnect', namespace='/')
def test_disconnect():
    """Handle client disconnections from the WebSocket."""
    print('Client disconnected')

if __name__ == '__main__':
    # Run a thread to simulate task progress
    threading.Thread(target=simulate_task_progress, daemon=True).start()
    # Run the Flask app with SocketIO integration
    socketio.run(app, debug=True)
