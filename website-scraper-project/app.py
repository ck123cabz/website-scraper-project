from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for
from classifier import classify_website
from url_filter import filter_url
from scraper import scrape_multiple_websites
import os
import time
import threading
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

tasks = {}
task_lock = threading.Lock()
task_counter = 0  # Start task ID counter from 0

def background_task(urls, task_id):
    """Background task that processes the URLs and updates progress."""
    global task_counter
    try:
        total_urls = len(urls)
        results = []
        start_time = time.time()  # Store task start time

        for idx, url in enumerate(urls):
            with task_lock:
                if tasks[task_id]['canceled']:
                    tasks[task_id]['status'] = 'Canceled'
                    break

            # Update task status
            elapsed_time = time.time() - start_time
            progress_percent = (idx + 1) / total_urls
            with task_lock:
                tasks[task_id]['status'] = f"Processing {url} ({idx + 1}/{total_urls})"
                tasks[task_id]['progress'] = int(progress_percent * 100)
                tasks[task_id]['elapsed_time'] = int(elapsed_time)
                tasks[task_id]['estimated_remaining_time'] = int((elapsed_time / progress_percent) - elapsed_time)

            result = process_url(url)
            with task_lock:
                results.append(result)

        # Save results to CSV
        if not tasks[task_id]['canceled']:
            save_results_to_csv(results, task_id)
            with task_lock:
                tasks[task_id]['status'] = 'Completed'
    finally:
        with task_lock:
            tasks[task_id]['done'] = True

def process_url(url):
    try:
        filtered, filtered_category, filter_trigger = filter_url(url)
        if filtered:
            return {'url': url, 'result': 'No Fit', 'explanation': f"Filtered due to {filtered_category}, triggered by {filter_trigger}", 'title': 'N/A', 'meta_description': 'N/A', 'text_content': 'N/A'}
        scraped_data = scrape_multiple_websites([url], max_workers=3, delay=2)[0]
        if scraped_data:
            classification_result = classify_website(scraped_data)
            return {'url': url, 'result': classification_result['classification'], 'explanation': classification_result['explanation'], 'title': scraped_data.get('title', 'N/A'), 'meta_description': scraped_data.get('meta_description', 'N/A'), 'text_content': scraped_data.get('text_content', 'N/A')}
        return {'url': url, 'result': 'Error', 'explanation': 'No data scraped', 'title': 'N/A', 'meta_description': 'N/A', 'text_content': 'N/A'}
    except Exception as e:
        logging.error(f"Error processing URL {url}: {e}")
        return {'url': url, 'result': 'Error', 'explanation': 'Exception occurred', 'title': 'N/A', 'meta_description': 'N/A', 'text_content': 'N/A'}

def save_results_to_csv(results, task_id):
    results_csv = f
