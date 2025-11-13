// Test script for keyword filter fix
const testUrls = [
  'https://newsroom.com',
  'https://sportsroom.com',
  'https://legitimate-company.com',
  'https://news-site.com',
  'https://sports-center.com'
];

async function testLayer1Filter(url) {
  try {
    const response = await fetch('http://localhost:3001/api/test-layer1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const result = await response.json();
    console.log(`${url}: ${result.passed ? 'PASS' : 'REJECT'} - ${result.reasoning}`);
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
  }
}

(async () => {
  console.log('Testing keyword filter fix...\n');
  for (const url of testUrls) {
    await testLayer1Filter(url);
  }
})();
