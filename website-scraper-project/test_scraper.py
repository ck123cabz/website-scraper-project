# Import the scraping functions from scraper.py
from scraper import scrape_website_data, scrape_multiple_websites

# Example URLs for testing
test_urls = ["medialandscapes.org", "bibit.id", "rvmobileinternet.com", "diadona.id", "mythdetector.ge"
]

# Test scrape_website_data function for a single website
def test_scrape_single_website():
    url = "https://joingenius.com"
    result = scrape_website_data(url)
    if result:
        print("Scraped Data from Single Website:")
        for key, value in result.items():
            print(f"{key}: {value}")
    else:
        print("Failed to scrape the website.")

# Test scrape_multiple_websites function for multiple websites
def test_scrape_multiple_websites():
    results = scrape_multiple_websites(test_urls, max_workers=1, delay=2)
    for idx, result in enumerate(results):
        if result:
            print(f"\nResult for URL {test_urls[idx]}:")
            for key, value in result.items():
                print(f"{key}: {value}")
        else:
            print(f"Failed to scrape the website: {test_urls[idx]}")

# Execute the tests
if __name__ == "__main__":
    print("Starting tests...\n")
    
    # Test single website scraping
    test_scrape_single_website()
    
    print("\n" + "="*50 + "\n")
    
    # Test multiple website scraping
    test_scrape_multiple_websites()

    print("\nTests completed.")
