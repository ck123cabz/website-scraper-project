from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for
from classifier import classify_website
from url_filter import filter_url
from scraper import scrape_multiple_websites
import os
import time
import threading
import logging

app = Flask(__name__)

# Dictionary to store task details
tasks = {}
current_task = None  # Track the currently running task
task_counter = 0  # Start task ID counter from 0


def background_task(urls, task_id):
    """Background task that processes the URLs and updates progress."""

    global current_task
    current_task = task_id

    total_urls = len(urls)
    results = []
    start_time = time.time()  # Store task start time
    
    for idx, url in enumerate(urls):
        if tasks[task_id]['canceled']:
            tasks[task_id]['status'] = 'Canceled'
            break

        # Update task status
        elapsed_time = time.time() - start_time  # Calculate elapsed time
        progress_percent = (idx + 1) / total_urls
        estimated_total_time = elapsed_time / progress_percent  # Estimate total time
        estimated_remaining_time = estimated_total_time - elapsed_time
        
        tasks[task_id]['status'] = f"Processing {url} ({idx + 1}/{total_urls})"
        tasks[task_id]['progress'] = int(progress_percent * 100)
        tasks[task_id]['elapsed_time'] = int(elapsed_time)
        tasks[task_id]['estimated_remaining_time'] = int(estimated_remaining_time)

        # Apply URL filtering
        try:
            filtered, filtered_category, filter_trigger = filter_url(url)
        except Exception as e:
            logging.error(f"Error filtering URL {url}: {e}")
            filtered = False

        if filtered:
            results.append({
                'url': url, 
                'result': 'Filtered',
                'confidence_score': 'N/A',
                'gpt_classification': f"Filtered due to {filtered_category}, triggered by {filter_trigger}"
            })
        else:
            try:
                scraped_data = scrape_multiple_websites([url], max_workers= 3, delay=2)[0]
                if scraped_data:
                    classification_result = classify_website(scraped_data)
                    results.append({
                        'url': url,
                        'result': classification_result['classification'],  # Proceed or No Fit
                        'confidence_score': classification_result['confidence_score'],  # Confidence Score
                        'gpt_classification': classification_result['gpt_classification']  # GPT Classification
                    })
                else:
                    results.append({
                        'url': url,
                        'result': 'Error',
                        'confidence_score': 'N/A',
                        'gpt_classification': 'No data scraped'
                    })
            except Exception as e:
                logging.error(f"Error scraping or classifying URL {url}: {e}")
                results.append({
                    'url': url,
                    'result': 'Error',
                    'confidence_score': 'N/A',
                    'gpt_classification': 'Scraping or classification failed'
                })

        # Simulate processing time
        time.sleep(2)

    # Save results to CSV
    if not tasks[task_id]['canceled']:
        results_csv = f"results_{task_id}.csv"
        with open(results_csv, 'w') as f:
            # Write the CSV headers
            f.write('url,result,confidence_score,gpt_classification\n')
            # Write the rows for each result
            for result in results:
                f.write(f"{result['url']},{result.get('result')},{result.get('confidence_score')},{result.get('gpt_classification')}\n")

        tasks[task_id]['results'] = results_csv
        tasks[task_id]['status'] = 'Completed'
    
    current_task = None
    tasks[task_id]['done'] = True


@app.route("/", methods=["GET", "POST"])
def home():
    """Dashboard displaying all tasks and allowing new task creation."""
    global current_task
    global task_counter  # Use global task_counter to assign task IDs
    
    if request.method == "POST":
        # Prevent starting a new task if one is already running
        if current_task is not None:
            return render_template("dashboard.html", tasks=tasks, error="A task is already running.")
        
        # Get the file with URLs
        file = request.files['file']
        urls = file.read().decode("utf-8").splitlines()

        # Use the task_counter for task ID and then increment it
        task_id = str(task_counter)
        task_counter += 1  # Increment task counter for the next task

        # Initialize the task status
        tasks[task_id] = {'progress': 0, 'status': 'Starting', 'done': False, 'results': None, 'canceled': False}

        # Start background task for processing URLs
        threading.Thread(target=background_task, args=(urls, task_id)).start()

        return redirect(url_for("home"))

    return render_template("dashboard.html", tasks=tasks)


@app.route("/progress/<task_id>")
def progress(task_id):
    """Return task progress and status as JSON."""
    task = tasks.get(task_id, None)
    if task:
        return jsonify(progress=task['progress'], status=task['status'], done=task['done'], 
                       results=task['results'], elapsed_time=task['elapsed_time'], 
                       estimated_remaining_time=task['estimated_remaining_time'])
    return jsonify(progress=0, status="Task not found", done=True)

@app.route("/cancel/<task_id>")
def cancel_task(task_id):
    """Cancel a running task."""
    global current_task
    if current_task == task_id:
        tasks[task_id]['canceled'] = True
        return redirect(url_for("home"))
    return "Task not found or not running", 404


@app.route("/download/<task_id>")
def download(task_id):
    """Download the result CSV of a completed task."""
    task = tasks.get(task_id, None)
    if task and task['results']:
        return send_file(task['results'], as_attachment=True)
    return "No results available for this task.", 404


if __name__ == "__main__":
    app.run(debug=True, port=5001)
