#!/usr/bin/env node
import readline from 'readline';
import fetch from 'node-fetch';

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Base URL for SLOP API
let baseUrl = '';

// Helper function to ensure proper URL formatting
function formatUrl(base, path) {
  // Remove trailing slash from base if present
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  // Add leading slash to path if not present
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return cleanBase + cleanPath;
}

// Start the CLI
console.log('🔮 SLOP CLI Tester 🔮');
console.log('===================');

// Ask for the base URL
rl.question('Enter SLOP API base URL: ', (url) => {
  baseUrl = url.trim();
  if (!baseUrl.startsWith('http')) {
    baseUrl = 'http://' + baseUrl;
  }
  showMainMenu();
});

// Display main menu with endpoint options
function showMainMenu() {
  console.log('\nAvailable SLOP endpoints:');
  console.log('1. /chat - Chat with AI');
  console.log('2. /tools - Use AI tools');
  console.log('3. /memory - Store and retrieve data');
  console.log('4. /resources - Access knowledge and files');
  console.log('5. /pay - Handle payments');
  console.log('6. /info - Server metadata');
  console.log('7. Change base URL');
  console.log('8. Exit');
  
  rl.question('Select endpoint (1-8): ', (choice) => {
    switch (choice) {
      case '1': handleChat(); break;
      case '2': handleTools(); break;
      case '3': handleMemory(); break;
      case '4': handleResources(); break;
      case '5': handlePay(); break;
      case '6': handleInfo(); break;
      case '7': 
        rl.question('Enter new base URL: ', (url) => {
          baseUrl = url.trim();
          if (!baseUrl.startsWith('http')) {
            baseUrl = 'http://' + baseUrl;
          }
          showMainMenu();
        });
        break;
      case '8': 
        console.log('Goodbye! 👋');
        rl.close();
        break;
      default: 
        console.log('Invalid choice, try again.');
        showMainMenu();
    }
  });
}

// Handle /chat endpoint
async function handleChat() {
  console.log('\n📝 Chat with AI');
  rl.question('Enter your message: ', async (message) => {
    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }]
        })
      });
      
      const data = await response.json();
      console.log('\nResponse:');
      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
    showMainMenu();
  });
}

// Handle /tools endpoint
async function handleTools() {
  console.log('\n🛠️ Tools');
  console.log('1. List all tools (GET /tools)');
  console.log('2. Use a specific tool (POST /tools/:tool_id)');
  
  rl.question('Select option (1-2): ', async (choice) => {
    try {
      if (choice === '1') {
        const response = await fetch(`${baseUrl}/tools`);
        const data = await response.json();
        console.log('\nAvailable Tools:');
        console.log(JSON.stringify(data, null, 2));
      } else if (choice === '2') {
        rl.question('Enter tool ID: ', async (toolId) => {
          rl.question('Enter tool parameters (as JSON): ', async (params) => {
            const response = await fetch(`${baseUrl}/tools/${toolId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: params
            });
            const data = await response.json();
            console.log('\nTool Response:');
            console.log(JSON.stringify(data, null, 2));
            showMainMenu();
          });
        });
        return;
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
    showMainMenu();
  });
}

// Handle /memory endpoint
async function handleMemory() {
  console.log('\n🧠 Memory');
  console.log('1. Store data (POST /memory)');
  console.log('2. Get data by key (GET /memory/:key)');
  console.log('3. List all keys (GET /memory)');
  
  rl.question('Select option (1-3): ', (choice) => {
    if (choice === '1') {
      rl.question('Enter key: ', (key) => {
        rl.question('Enter value (as JSON): ', async (value) => {
          try {
            const response = await fetch(`${baseUrl}/memory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key, value: JSON.parse(value) })
            });
            const data = await response.json();
            console.log('\nResponse:');
            console.log(JSON.stringify(data, null, 2));
          } catch (error) {
            console.error('Error:', error.message);
          }
          showMainMenu();
        });
      });
      return;
    } else if (choice === '2') {
      rl.question('Enter key: ', async (key) => {
        try {
          const response = await fetch(`${baseUrl}/memory/${key}`);
          const data = await response.json();
          console.log('\nRetrieved Data:');
          console.log(JSON.stringify(data, null, 2));
        } catch (error) {
          console.error('Error:', error.message);
        }
        showMainMenu();
      });
      return;
    } else if (choice === '3') {
      (async () => {
        try {
          const response = await fetch(`${baseUrl}/memory`);
          const data = await response.json();
          console.log('\nAll Keys:');
          console.log(JSON.stringify(data, null, 2));
        } catch (error) {
          console.error('Error:', error.message);
        }
        showMainMenu();
      })();
    } else {
      console.log('Invalid choice');
      showMainMenu();
    }
  });
}

// Handle /resources endpoint
async function handleResources() {
  console.log('\n📚 Resources');
  console.log('1. List all resources (GET /resources)');
  console.log('2. Get resource by ID (GET /resources/:id)');
  console.log('3. Create a resource (POST /resources)');
  
  rl.question('Select option (1-3): ', (choice) => {
    if (choice === '1') {
      (async () => {
        try {
          const url = formatUrl(baseUrl, 'resources');
          console.log(`\nSending GET to ${url}`);
          const response = await fetch(url);
          const data = await response.json();
          console.log('\nAll Resources:');
          console.log(JSON.stringify(data, null, 2));
        } catch (error) {
          console.error('Error:', error.message);
        }
        showMainMenu();
      })();
    } else if (choice === '2') {
      rl.question('Enter resource ID: ', async (id) => {
        try {
          const url = formatUrl(baseUrl, `resources/${id}`);
          console.log(`\nSending GET to ${url}`);
          const response = await fetch(url);
          const data = await response.json();
          console.log('\nResource:');
          console.log(JSON.stringify(data, null, 2));
        } catch (error) {
          console.error('Error:', error.message);
        }
        showMainMenu();
      });
    } else if (choice === '3') {
      rl.question('Enter resource data (as JSON): ', async (resourceData) => {
        try {
          // Parse the JSON to get the ID for verification later
          let resourceObject;
          try {
            resourceObject = JSON.parse(resourceData);
          } catch (parseError) {
            console.error('Error parsing JSON input:', parseError.message);
            showMainMenu();
            return;
          }

          const url = formatUrl(baseUrl, 'resources');
          console.log(`\nSending POST to ${url} with data:`);
          console.log(resourceData);
          
          // Print the exact curl command equivalent for comparison
          console.log('\nEquivalent curl command:');
          console.log(`curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '${resourceData}'`);
          
          // Make the POST request
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: resourceData
          });
          
          console.log(`Response status: ${response.status} ${response.statusText}`);
          
          // Try to parse the response
          const rawResponse = await response.text();
          console.log(`\nRaw response:`);
          console.log(rawResponse);
          
          let responseObject;
          try {
            responseObject = JSON.parse(rawResponse);
            console.log('\nParsed response:');
            console.log(JSON.stringify(responseObject, null, 2));
          } catch (parseError) {
            console.log('Could not parse response as JSON');
          }
          
          // Check if the resource was created by status code, not by verification
          if (response.status >= 200 && response.status < 300) {
            console.log('\n✅ Resource creation request successful!');
            
            // Try to verify by getting the resource if we have an ID
            if (resourceObject && resourceObject.id) {
              const verifyUrl = formatUrl(baseUrl, `resources/${resourceObject.id}`);
              console.log(`\nAttempting to retrieve the created resource (${resourceObject.id})...`);
              console.log(`Sending GET to ${verifyUrl}`);
              try {
                const verifyResponse = await fetch(verifyUrl);
                
                if (verifyResponse.ok) {
                  const retrievedResource = await verifyResponse.json();
                  console.log('\nRetrieved resource:');
                  console.log(JSON.stringify(retrievedResource, null, 2));
                } else {
                  console.log(`\nCould not retrieve resource: ${verifyResponse.status} ${verifyResponse.statusText}`);
                }
              } catch (verifyError) {
                console.error('Error verifying resource:', verifyError.message);
              }
            }
          } else {
            console.log('❌ Error creating resource. Status code:', response.status);
          }
        } catch (error) {
          console.error('Request error:', error.message);
        }
        showMainMenu();
      });
    } else {
      console.log('Invalid choice');
      showMainMenu();
    }
  });
}

// Handle /pay endpoint
async function handlePay() {
  console.log('\n💳 Payments');
  rl.question('Enter payment details (as JSON): ', async (paymentData) => {
    try {
      const response = await fetch(`${baseUrl}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: paymentData
      });
      const data = await response.json();
      console.log('\nPayment Response:');
      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
    showMainMenu();
  });
}

// Handle /info endpoint
async function handleInfo() {
  console.log('\nℹ️ Server Info');
  try {
    const response = await fetch(`${baseUrl}/info`);
    const data = await response.json();
    console.log('\nServer Information:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  showMainMenu();
}