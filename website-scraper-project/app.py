from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import threading
import time
import os
import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

tasks = {}
task_counter = 0

def background_task(task_id, filename):
    """Background task that processes the URLs and updates progress."""
    total_urls = 100  # Simulating 100 URLs
    start_time = time.time()  # Store task start time

    for idx in range(total_urls):
        if tasks[task_id]['canceled']:
            emit('progress', {'task_id': task_id, 'progress': 100, 'time_remaining': '00:00', 'status': 'Canceled'}, namespace='/')
            break

        time.sleep(0.1)  # Simulate processing time
        progress_percent = (idx + 1) / total_urls
        elapsed_time = time.time() - start_time
        estimated_total_time = elapsed_time / progress_percent
        estimated_remaining_time = estimated_total_time - elapsed_time
        
        tasks[task_id]['progress'] = int(progress_percent * 100)
        tasks[task_id]['estimated_time'] = f"{int(estimated_remaining_time // 60):02d}:{int(estimated_remaining_time % 60):02d}"
        
        emit('progress', {
            'task_id': task_id,
            'progress': tasks[task_id]['progress'],
            'time_remaining': tasks[task_id]['estimated_time'],
            'status': 'Processing'
        }, namespace='/')

    if not tasks[task_id]['canceled']:
        tasks[task_id]['status'] = 'Completed'
        tasks[task_id]['completion_time'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        emit('completed', {'task_id': task_id, 'status': 'Completed'}, namespace='/')

@app.route("/", methods=["GET", "POST"])
def index():
    return render_template('dashboard.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    filename = file.filename
    save_path = os.path.join('uploads', filename)
    file.save(save_path)
    
    global task_counter
    task_id = str(task_counter)
    task_counter += 1

    tasks[task_id] = {
        'file_path': save_path,
        'progress': 0,
        'status': 'Pending',
        'canceled': False,
        'upload_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'completion_time': None,
        'estimated_time': ''
    }

    # Start background task
    threading.Thread(target=background_task, args=(task_id, filename)).start()

    return jsonify({'task_id': task_id}), 200

@socketio.on('connect', namespace='/')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect', namespace='/')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('cancel_task', namespace='/')
def handle_cancel_task(data):
    task_id = data['task_id']
    if task_id in tasks:
        tasks[task_id]['canceled'] = True
        tasks[task_id]['status'] = 'Canceled'
        print(f"Task {task_id} has been canceled by the user.")

if __name__ == '__main__':
    socketio.run(app, debug=True)
