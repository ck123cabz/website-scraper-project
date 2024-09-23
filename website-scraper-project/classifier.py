import os
import logging
import openai
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from the environment variables
api_key = os.getenv('OPENAI_API_KEY2')

# Initialize OpenAI client
openai.api_key = OpenAI(api_key=api_key)

logging.info(f"Environment: {os.environ}")


def classify_website(scraped_data):
    """Classifies the website content using GPT and custom scoring logic."""
    score = 0

    # Extract title, meta description, and text content
    title = scraped_data.get('title', '').lower()
    meta_description = scraped_data.get('meta_description', '').lower()
    text_content = scraped_data.get('text_content', '').lower()

    # Create a prompt for GPT to classify the content
    prompt = f"""
    The following is data scraped from a website:
    Meta Description: {scraped_data.get('meta_description', '')}
    Text Content: {scraped_data.get('text_content', '')}

    Does this website look like a good fit for guest posting? Answer "Proceed" or "No Fit".
    """

    try:
        # Call GPT API for classification
        response = openai.chat.completions.create(model="gpt-4o-mini",  # Replace with your desired model
        messages=[
            {"role": "system", "content": "You are a helpful assistant that classifies websites."},
            {"role": "user", "content": prompt}
        ],

        max_tokens=20  # Limit the response to minimal tokens for efficiency

        )

        gpt_classification = response.choices[0].message.content.strip().lower()
        logging.info(f"GPT Classification Response: {gpt_classification}")
        logging.info(f"Environment: {os.environ}")
        # Positive signals
        if any(keyword in meta_description or keyword in text_content for keyword in ['product', 'service', 'solution', 'pricing']):
            score += 20
        if any(keyword in meta_description or keyword in text_content for keyword in ['marketing', 'saas', 'b2b']):
            score += 10
        if any(keyword in meta_description or keyword in text_content for keyword in ['contact us', 'get a quote', 'start free trial']):
            score += 10
        # Negative signals
        if any(keyword in meta_description or keyword in text_content for keyword in ['news', 'media', 'lifestyle', 'health']):
            score -= 20
        if 'generic' in meta_description:
            score -= 10

        # GPT classification adds weight
        if 'proceed' in gpt_classification:
            score += 50

        # Determine final classification based on score
        classification = "Proceed" if score >= 50 else "No Fit"

        return {
            'classification': classification,
            'confidence_score': score,
            'gpt_classification': gpt_classification
        }

    except Exception as e:
        logging.error(f"Error calling GPT API: {e}")
        return None
