from flask import Flask, jsonify, request, render_template, send_file, redirect, url_for
import threading
import logging
from werkzeug.utils import secure_filename
import os
import time

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

tasks = {}
task_counter = 0
task_lock = threading.Lock()

def background_task(urls, task_id):
    """Simulate a background task that processes URLs."""
    with task_lock:
        tasks[task_id]['status'] = 'Running'
        logging.info(f"Task {task_id} started.")
    
    # Simulated processing for each URL
    for url in urls:
        time.sleep(1)  # Simulate some processing time
        tasks[task_id]['result'] = f"Processed {url}"
    
    with task_lock:
        tasks[task_id]['status'] = 'Completed'
        logging.info(f"Task {task_id} completed.")

def handle_file_upload(file_storage):
    """Save the uploaded file and return its path."""
    filename = secure_filename(file_storage.filename)
    file_path = os.path.join('uploads', filename)
    file_storage.save(file_path)
    return file_path

@app.route("/", methods=["GET", "POST"])
def home():
    global task_counter
    if request.method == "POST":
        file = request.files['file']
        file_path = handle_file_upload(file)
        urls = open(file_path).read().splitlines()

        with task_lock:
            task_id = str(task_counter)
            tasks[task_id] = {'status': 'Starting', 'progress': 0, 'done': False, 'results': None}
            task_counter += 1

        threading.Thread(target=background_task, args=(urls, task_id)).start()
        return redirect(url_for("home"))

    return render_template("dashboard.html", tasks=tasks)

@app.route("/tasks")
def get_tasks():
    """API endpoint to fetch all tasks with their current status and progress."""
    with task_lock:
        return jsonify([tasks[task_id] for task_id in tasks])

@app.route("/cancel/<task_id>", methods=["POST"])
def cancel_task(task_id):
    """API endpoint to cancel a running task."""
    with task_lock:
        if task_id in tasks and not tasks[task_id].get('done', False):
            tasks[task_id]['status'] = 'Canceled'
            tasks[task_id]['done'] = True
            return jsonify({'status': 'Task canceled'}), 200
    return jsonify({'status': 'Task not found or already completed'}), 404

@app.route("/download/<task_id>")
def download(task_id):
    """Download the results of a completed task if available."""
    with task_lock:
        task = tasks.get(task_id)
        if task and 'results' in task and task['results']:
            return send_file(task['results'], as_attachment=True)
    return "No results available for this task.", 404

if __name__ == "__main__":
    app.run(debug=True, port=5001)
