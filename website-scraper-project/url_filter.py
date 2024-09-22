import os
import openai
import logging
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(filename='url_filter.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Get the OpenAI API key from the environment variables
api_key = os.getenv('OPENAI_API_KEY')

# Set up OpenAI API key
client.api_key = OpenAI(api_key=api_key)

# Log the API key for debugging (make sure to remove this in production for security reasons)
logging.info(f"Using OpenAI API Key: {api_key}")

# Predefined categories and keywords for filtering
FILTER_CATEGORIES = {
    "News and Media": ['news', 'report', 'magazine', 'press', 'daily', 'media'],
    "Health and Wellness": ['health', 'care', 'wellness'],
    "Finance and Investment": ['finance', 'invest', 'bank'],
    "Educational Institutions": ['edu', 'school', 'academy', 'uni', 'library'],
    "Government and Non-Profit Organizations": ['gov', 'org'],
    "Country, Region, and State-Specific URLs": ['.cl', '.eg', '.ph', 'California', 'New York'],
    "Cryptocurrency and Blockchain": ['bitcoin', 'coin', 'blockchain'],
    "Sports and Entertainment": ['sport', 'bet', 'racing'],
    "Religious Content": ['christ', 'jesus'],
    "Travel and Tourism": ['travel', 'ticket']
}

# Function to classify URLs based on context and keywords using the new ChatCompletion API
def filter_url(url):
    prompt = f"Based on just the text, Does this URL strictly have an exact match with any of the keywords in following categories? {FILTER_CATEGORIES}\nURL: {url}\n"

    try:
        # Call OpenAI API using the new ChatCompletion endpoint
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # or "gpt-4" if available
            messages=[
                {"role": "system", "content": "You are a helpful assistant that categorizes websites."},
                {"role": "user", "content": prompt}
            ]
        )

        classification = response.choices[0].message.content.strip().lower()

        # Check if the classification contains any keywords from the filter categories
        for category, keywords in FILTER_CATEGORIES.items():
            for keyword in keywords:
                if keyword.lower() in classification:
                    logging.info(f"Filtered out URL: {url} under category: {category}, Trigger: {keyword}")
                    return True, category, f"Contains keyword: {keyword}"

        # If no keywords matched, the URL passes through
        return False, None, None

    except Exception as e:
        logging.error(f"Error filtering URL {url}: {e}")
        return False, None, None


if __name__ == "__main__":
    # Example test run (Replace with actual URL)
    test_url = 'https://example.com'
    result = filter_url(test_url)
    print(f"URL Filter Result: {result}")
