import os
import logging
import openai
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from the environment variables
api_key = os.getenv('OPENAI_API_KEY')

# Initialize OpenAI client
client.api_key = OpenAI(api_key=api_key)


def classify_website(scraped_data):
    """Classifies the website content using GPT, focusing on business relevance and excluding media-related content."""
    
    # Extract title, meta description, and text content
    title = scraped_data.get('title', '').lower()
    meta_description = scraped_data.get('meta_description', '').lower()
    text_content = scraped_data.get('text_content', '').lower()

    # Updated Prompt with Additional Context and Criteria
    prompt = f"""
    You are classifying websites based on their relevance for guest posting. Prioritize sites with marketing, business, product-related content, and high-quality copy.
    
    Declassify sites that focus on news, media, or general reporting.

    Website Data:
    - Title: {title}
    - Meta Description: {meta_description}
    - Text Content: {text_content}

    Answer with "Proceed" for business/marketing/product-related content or "No Fit" if the content is news, media-related, or irrelevant. Provide a reason for your decision.
    """

    try:
        # Call GPT API for classification
        response = client.chat.completions.create(model="gpt-4o-mini",  # Replace with your desired model
        messages=[
            {"role": "system", "content": "You are a helpful assistant that classifies websites."},
            {"role": "user", "content": prompt}
        ],

        max_tokens=30,  # Adjust if needed
        temperature=0.2  # Lower value for deterministic output

        )

        # Get GPT classification response
        gpt_classification = response.choices[0].message["content"].strip().lower()
        logging.info(f"GPT Classification Response: {gpt_classification}")

        # Post-process the response
        if 'proceed' in gpt_classification:
            classification = 'Proceed'
        elif 'no fit' in gpt_classification:
            classification = 'No Fit'
        else:
            classification = 'Unclear'

        # Extract the explanation from the response
        explanation = gpt_classification.split('\n', 1)[-1] if '\n' in gpt_classification else 'No explanation'

        # Return result
        return {
            'classification': classification,
            'gpt_classification': gpt_classification,
            'explanation': explanation  # Return the reasoning from GPT
        }

    except Exception as e:
        logging.error(f"Error calling GPT API: {e}")
        return None
