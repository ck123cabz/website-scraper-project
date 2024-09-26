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
        elapsed_time = time.time() - start_time
        progress_percent = (idx + 1) / total_urls
        estimated_total_time = elapsed_time / progress_percent
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
                'gpt_classification': f"Filtered due to {filtered_category}, triggered by {filter_trigger}",
                'title': 'N/A',
                'meta_description': 'N/A',
                'text_content': 'N/A'
            })
        else:
            try:
                scraped_data = scrape_multiple_websites([url], max_workers=3, delay=2)[0]
                if scraped_data:
                    classification_result = classify_website(scraped_data)
                    results.append({
                        'url': url,
                        'result': classification_result['classification'],
                        'confidence_score': classification_result['confidence_score'],
                        'gpt_classification': classification_result['gpt_classification'],
                        'title': scraped_data.get('title', 'N/A'),
                        'meta_description': scraped_data.get('meta_description', 'N/A'),
                        'text_content': scraped_data.get('text_content', 'N/A')
                    })
                else:
                    results.append({
                        'url': url,
                        'result': 'Error',
                        'confidence_score': 'N/A',
                        'gpt_classification': 'No data scraped',
                        'title': 'N/A',
                        'meta_description': 'N/A',
                        'text_content': 'N/A'
                    })
            except Exception as e:
                logging.error(f"Error scraping or classifying URL {url}: {e}")
                results.append({
                    'url': url,
                    'result': 'Error',
                    'confidence_score': 'N/A',
                    'gpt_classification': 'Scraping or classification failed',
                    'title': 'N/A',
                    'meta_description': 'N/A',
                    'text_content': 'N/A'
                })

        time.sleep(2)  # Simulate processing delay

    # Save results to CSV
    if not tasks[task_id]['canceled']:
        results_csv = f"results_{task_id}.csv"
        with open(results_csv, 'w') as f:
            # Write the CSV headers including title, meta description, and text content
            f.write('url,result,confidence_score,gpt_classification,title,meta_description,text_content\n')
            for result in results:
                f.write(f"{result['url']},{result.get('result')},{result.get('confidence_score')},{result.get('gpt_classification')},"
                        f"{result.get('title')},{result.get('meta_description')},{result.get('text_content')}\n")

        tasks[task_id]['results'] = results_csv
        tasks[task_id]['status'] = 'Completed'
    
    current_task = None
    tasks[task_id]['done'] = True
