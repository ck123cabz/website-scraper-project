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
    with task_lock:
        tasks[task_id]['status'] = 'Running'
    results = []
    start_time = time.time()
    
    for idx, url in enumerate(urls):
        with task_lock:
            if tasks[task_id]['canceled']:
                tasks[task_id]['status'] = 'Canceled'
                break

        result = process_url(url)
        with task_lock:
            tasks[task_id]['progress'] = int((idx + 1) / len(urls) * 100)
            results.append(result)

    with task_lock:
        if not tasks[task_id]['canceled']:
            save_results_to_csv(results, task_id)
            tasks[task_id]['status'] = 'Completed'
        tasks[task_id]['done'] = True

def process_url(url):
    try:
        filtered, filtered_category, filter_trigger = filter_url(url)
        if filtered:
            return {'url': url, 'result': 'Filtered', 'explanation': f"Due to {filtered_category}, triggered by {filter_trigger}", 'title': 'N/A', 'meta_description': 'N/A', 'text_content': 'N/A'}
        scraped_data = scrape_multiple_websites([url])[0]
        classification_result = classify_website(scraped_data)
        return {'url': url, 'result': classification_result['classification'], 'explanation': classification_result['explanation'], 'title': scraped_data.get('title', 'N/A'), 'meta_description': scraped_data.get('meta_description', 'N/A'), 'text_content': scraped_data.get('text_content', 'N/A')}
    except Exception as e:
        logging.error(f"Error processing URL {url}: {e}")
        return {'url': url, 'result': 'Error', 'explanation': 'Exception occurred', 'title': 'N/A', 'meta_description': 'N/A', 'text_content': 'N/A'}

def save_results_to_csv(results, task_id):
    results_csv = f"results_{task_id}.csv"
    with open(results_csv, 'w') as f:
        f.write('Url,Result,Explanation,Title,Meta Description,Text Content\n')
        for result in results:
            f.write(f"{result['url']},{result['result']},\"{result['explanation']}\",\"{result['title']}\",\"{result['meta_description']}\",\"{result['text_content']}\"\n")
    with task_lock:
        tasks[task_id]['results'] = results_csv

@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        file = request.files['file']
        filename = secure_filename(file.filename)
        file.save(os.path.join('uploads', filename))
        urls = open(os.path.join('uploads', filename)).read().splitlines()

        task_id = str(len(tasks))
        tasks[task_id] = {'progress': 0, 'status': 'Starting', 'done': False, 'results': None, 'canceled': False}

        threading.Thread(target=background_task, args=(urls, task_id)).start()
        return redirect(url_for("home"))

    return render_template("dashboard.html", tasks=tasks)

@app.route("/cancel/<task_id>")
def cancel_task(task_id):
    with task_lock:
        if task_id in tasks and not tasks[task_id]['done']:
            tasks[task_id]['canceled'] = True
            tasks[task_id]['status'] = 'Canceled'
            return redirect(url_for("home"))
    return "Task not found or not running", 404

@app.route("/download/<task_id>")
def download(task_id):
    task = tasks.get(task_id)
    if task and task['results']:
        return send_file(task['results'], as_attachment=True)
    return "No results available for this task.", 404

if __name__ == "__main__":
    app.run(debug=True, port=5001)
