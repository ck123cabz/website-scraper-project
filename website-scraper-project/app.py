from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for
import os
import time
import threading
import logging
from werkzeug.utils import secure_filename
from classifier import classify_website
from url_filter import filter_url
from scraper import scrape_multiple_websites

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

tasks = {}
task_lock = threading.Lock()
task_counter = 0  # Start task ID counter from 0

def background_task(urls, task_id):
    """Background task that processes the URLs and updates progress."""
    with task_lock:
        tasks[task_id]['status'] = 'Running'
    results = []
    start_time = time.time()
    
    for idx, url in enumerate(urls):
        if 'canceled' in tasks[task_id] and tasks[task_id]['canceled']:
            with task_lock:
                tasks[task_id]['status'] = 'Canceled'
                break

        result = process_url(url)
        with task_lock:
            tasks[task_id]['progress'] = int((idx + 1) / len(urls) * 100)
            results.append(result)

    with task_lock:
        if 'canceled' not in tasks[task_id] or not tasks[task_id]['canceled']:
            save_results_to_csv(results, task_id)
            tasks[task_id]['status'] = 'Completed'
        tasks[task_id]['done'] = True

def process_url(url):
    """Processes an individual URL by filtering and classifying it."""
    try:
        filtered, filtered_category, filter_trigger = filter_url(url)
        if filtered:
            return {'id': url, 'status': 'Filtered', 'progress': 100, 'results': None, 'done': True}
        scraped_data = scrape_multiple_websites([url])[0]
        classification_result = classify_website(scraped_data)
        return {'id': url, 'status': classification_result['classification'], 'progress': 100, 'results': 'Available', 'done': True}
    except Exception as e:
        logging.error(f"Error processing URL {url}: {e}")
        return {'id': url, 'status': 'Error', 'progress': 0, 'results': None, 'done': True}

def save_results_to_csv(results, task_id):
    """Saves results of a task to a CSV file."""
    results_csv = f"results_{task_id}.csv"
    with open(results_csv, 'w') as f:
        f.write('Url,Result\n')
        for result in results:
            f.write(f"{result['id']},{result['status']}\n")
    with task_lock:
        tasks[task_id]['results'] = results_csv

@app.route("/", methods=["GET", "POST"])
def home():
    """Renders the main dashboard and handles file uploads."""
    if request.method == "POST":
        file = request.files['file']
        filename = secure_filename(file.filename)
        file_path = os.path.join('uploads', filename)
        file.save(file_path)
        urls = open(file_path).read().splitlines()

        task_id = str(task_counter)
        with task_lock:
            tasks[task_id] = {'id': task_id, 'status': 'Starting', 'progress': 0, 'done': False, 'results': None, 'canceled': False}
            global task_counter
            task_counter += 1

        threading.Thread(target=background_task, args=(urls, task_id)).start()
        return redirect(url_for("home"))

    return render_template("dashboard.html", tasks=tasks)

@app.route("/tasks")
def get_tasks():
    """Returns a list of all tasks with their current status and progress."""
    return jsonify([tasks[task_id] for task_id in tasks])

@app.route("/cancel/<task_id>", methods=["POST"])
def cancel_task(task_id):
    """Cancels a task if it is running."""
    with task_lock:
        if task_id in tasks and not tasks[task_id]['done']:
            tasks[task_id]['canceled'] = True
            tasks[task_id]['status'] = 'Canceled'
            return jsonify({'status': 'Task canceled'})
    return jsonify({'status': 'Task not found or not running'}), 404

@app.route("/download/<task_id>")
def download(task_id):
    """Downloads the result file for a completed task."""
    task = tasks.get(task_id)
    if task and 'results' in task and task['results']:
        return send_file(task['results'], as_attachment=True)
    return "No results available for this task.", 404

if __name__ == "__main__":
    app.run(debug=True, port=5001)
