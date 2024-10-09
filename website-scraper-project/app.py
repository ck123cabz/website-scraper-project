from flask import Flask, jsonify, request, render_template, send_file, redirect, url_for
import threading
import logging
import os
import time
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

tasks = {}
task_counter = 0
task_lock = threading.Lock()

def background_task(urls, task_id):
    start_time = datetime.now()
    tasks[task_id]['start_time'] = start_time.strftime('%Y-%m-%d %H:%M:%S')
    total = len(urls)
    processed = 0

    for url in urls:
        time.sleep(1)  # Simulate task processing time
        processed += 1
        with task_lock:
            if tasks[task_id]['canceled']:
                tasks[task_id]['status'] = 'Canceled'
                break
            tasks[task_id]['progress'] = int((processed / total) * 100)
            elapsed_time = datetime.now() - start_time
            remaining_time = (elapsed_time / processed) * (total - processed)
            tasks[task_id]['estimated_time_remaining'] = str(remaining_time)

    with task_lock:
        tasks[task_id]['status'] = 'Completed' if not tasks[task_id].get('canceled') else tasks[task_id]['status']
        tasks[task_id]['done'] = True

@app.route("/", methods=["GET", "POST"])
def home():
    global task_counter
    if request.method == "POST":
        file = request.files['file']
        filename = secure_filename(file.filename)
        file_path = os.path.join('uploads', filename)
        file.save(file_path)
        urls = open(file_path).read().splitlines()

        task_id = str(task_counter)
        with task_lock:
            tasks[task_id] = {'id': task_id, 'status': 'Starting', 'progress': 0, 'done': False, 'canceled': False}
            task_counter += 1

        threading.Thread(target=background_task, args=(urls, task_id)).start()
        return redirect(url_for("home"))

    return render_template("dashboard.html", tasks=tasks)

@app.route("/tasks")
def get_tasks():
    with task_lock:
        return jsonify([tasks[task_id] for task_id in tasks])

@app.route("/cancel/<task_id>", methods=["POST"])
def cancel_task(task_id):
    with task_lock:
        if task_id in tasks and not tasks[task_id]['done']:
            tasks[task_id]['canceled'] = True
            tasks[task_id]['status'] = 'Canceled'
            return jsonify({'status': 'Task canceled'})
    return jsonify({'status': 'Task not found or already completed'}), 404

if __name__ == "__main__":
    app.run(debug=True, port=5001)
