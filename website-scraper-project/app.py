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

def process_url(url, results):
    try:
        scraped_data = scrape_multiple_websites([url])[0]
        if scraped_data:
            classification_result = classify_website(scraped_data)
            results.append({
                'url': url,
                'result': classification_result['classification'],
                'explanation': classification_result['explanation'],
                'title': scraped_data.get('title', 'N/A'),
                'meta_description': scraped_data.get('meta_description', 'N/A'),
                'text_content': scraped_data.get('text_content', 'N/A')
            })
    except Exception as e:
        logging.error(f"Error scraping or classifying URL {url}: {e}")
        results.append({
            'url': url,
            'result': 'Error',
            'explanation': 'Scraping or classification failed',
            'title': 'N/A',
            'meta_description': 'N/A',
            'text_content': 'N/A'
        })

def background_task(urls, task_id):
    with task_lock:
        tasks[task_id]['status'] = 'Running'
    results = []
    for idx, url in enumerate(urls):
        if tasks[task_id]['canceled']:
            tasks[task_id]['status'] = 'Canceled'
            break
        process_url(url, results)
        tasks[task_id]['progress'] = int((idx + 1) / len(urls) * 100)
        time.sleep(1)  # Simulate processing delay

    if not tasks[task_id]['canceled']:
        results_csv = f"results_{task_id}.csv"
        with open(results_csv, 'w') as f:
            f.write('Url,Result,Explanation,Title,Meta Description,Text Content\n')
            for result in results:
                f.write(f"{result['url']},{result['result']},\"{result['explanation']}\",\"{result['title']}\",\"{result['meta_description']}\",\"{result['text_content']}\"\n")
        tasks[task_id]['results'] = results_csv
        tasks[task_id]['status'] = 'Completed'
    tasks[task_id]['done'] = True

@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        file = request.files['file']
        filename = secure_filename(file.filename)
        file_path = os.path.join('/path/to/upload/folder', filename)
        file.save(file_path)
        urls = open(file_path).read().splitlines()

        with task_lock:
            task_id = str(len(tasks))
            tasks[task_id] = {'id': task_id, 'progress': 0, 'status': 'Pending', 'done': False, 'results': None, 'canceled': False}

        threading.Thread(target=background_task, args=(urls, task_id)).start()
        return redirect(url_for("home"))

    return render_template("dashboard.html", tasks=tasks.values())

@app.route("/cancel/<task_id>")
def cancel_task(task_id):
    with task_lock:
        if task_id in tasks and not tasks[task_id]['done']:
            tasks[task_id]['canceled'] = True
            tasks[task_id]['status'] = 'Canceled'
            return jsonify(status="Task canceled"), 200
        return jsonify(status="Task not found or already completed"), 404

@app.route("/download/<task_id>")
def download(task_id):
    task = tasks.get(task_id)
    if task and task['results']:
        return send_file(task['results'], as_attachment=True)
    return "No results available for this task.", 404

if __name__ == "__main__":
    app.run(debug=True, port=5001)
