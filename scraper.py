import os
import logging
from scrapingbee import ScrapingBeeClient
from bs4 import BeautifulSoup
import time
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Load ScrapingBee API key from environment variable
SCRAPINGBEE_KEY = os.getenv('SCRAPINGBEE_KEY')

# Initialize ScrapingBee client
client = ScrapingBeeClient(api_key=SCRAPINGBEE_KEY)

# Configure logging
logging.basicConfig(filename='scraper.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def format_url(url):
    if not url.startswith('http://') and not url.startswith('https://'):
        return 'https://' + url
    return url

def scrape_website_data(url):
    formatted_url = format_url(url)
    logging.info(f"Scraping {formatted_url} through ScrapingBee")
    try:
        response = client.get(formatted_url, params={'render_js': 'false'})
        
        if response.status_code != 200:
            logging.error(f"Failed to scrape {formatted_url}, Status code: {response.status_code}, Response: {response.content}")
            return {'url': formatted_url, 'error': f"Failed to scrape, Status code: {response.status_code}, Response: {response.content}"}
        
        # Parse the page content with BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract the desired data
        title = soup.find('title').text if soup.find('title') else "No Title"
        meta_description = soup.find('meta', {'name': 'description'})
        meta_description = meta_description['content'] if meta_description else "No Description"
        text_content = ' '.join([element.text.strip() for element in soup.find_all(['h1', 'h2', 'p', 'li'])])

        result = {
            'url': formatted_url,
            'title': title[:500],
            'meta_description': meta_description[:500],
            'text_content': text_content[:500],
        }

        logging.info(f"Successfully scraped {formatted_url}")
        return result

    except Exception as e:
        logging.error(f"Error scraping {formatted_url}: {e}")
        return {'url': formatted_url, 'error': str(e)}

# Function for scraping multiple websites with delay
def scrape_multiple_websites(urls, max_workers=5, delay=5):
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = []
        for result in executor.map(scrape_website_data, urls):
            results.append(result)
            time.sleep(delay)  # Delay between requests to avoid overloading servers
    return results
