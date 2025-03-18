import fetch from 'node-fetch';

// Standard SLOP endpoints to ensure we check
const SLOP_ENDPOINTS = [
  '/chat', '/chat/:id', '/chat/thread_:id',
  '/tools', '/tools/:tool_id',
  '/memory', '/memory/:key', '/memory/query',
  '/resources', '/resources/:id', '/resources/search', '/resources/prefix/:prefix',
  '/pay', '/pay/:id',
  '/info'  // Add /info endpoint to standard endpoints
];

// Standard method mapping for SLOP endpoints
const STANDARD_METHODS = {
  '/chat': ['POST', 'GET'],
  '/chat/:id': ['GET'],
  '/chat/thread_:id': ['GET'],
  '/tools': ['GET'],
  '/tools/:tool_id': ['POST'],
  '/memory': ['GET', 'POST'],
  '/memory/:key': ['GET', 'PUT', 'DELETE'],
  '/memory/query': ['POST'],
  '/resources': ['GET', 'POST'],
  '/resources/:id': ['GET', 'PUT', 'DELETE'],
  '/resources/search': ['POST'],
  '/resources/prefix/:prefix': ['GET'],
  '/pay': ['POST'],
  '/pay/:id': ['GET'],
  '/info': ['GET']  // Add /info endpoint method
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

// Sample data for testing POST requests - more detailed payloads
const TEST_PAYLOADS = {
  '/chat': { 
    messages: [{ role: 'user', content: 'Hello' }],
    model: "any-model" 
  },
  '/tools/:tool_id': { query: 'test' },
  '/tools/trivia': { action: 'start' },
  '/tools/hint': { question: 'current' },
  '/tools/score': { get: 'current' },
  '/memory': { key: 'test_key', value: 'test_value' },
  '/memory/query': { query: 'test query', limit: 1 },
  '/resources': { id: 'test', title: 'Test Resource', content: 'Test content', type: 'document' },
  '/resources/search': { q: 'test' },
  '/pay': { amount: 1, currency: 'USD', description: 'Test payment' }
};

// Get an appropriate payload for a POST or PUT request
function getTestPayload(endpoint) {
  // Try exact match first
  if (TEST_PAYLOADS[endpoint]) {
    return TEST_PAYLOADS[endpoint];
  }
  
  // Look for id-based endpoints
  if (endpoint.includes('/')) {
    const parts = endpoint.split('/');
    const lastPart = parts[parts.length - 1];
    const basePath = endpoint.substring(0, endpoint.lastIndexOf('/'));
    
    // Test for specific tool endpoints
    if (basePath === '/tools' && !endpoint.includes(':')) {
      return TEST_PAYLOADS[`/tools/${lastPart}`] || { tool_id: lastPart };
    }
    
    // Test for specific resource endpoints
    if (basePath === '/resources' && !endpoint.includes(':')) {
      return { id: lastPart, query: 'test' };
    }
  }
  
  // Try matching pattern endpoints
  for (const [pattern, payload] of Object.entries(TEST_PAYLOADS)) {
    if (pattern.includes(':') && endpoint.split('/').length === pattern.split('/').length) {
      if (pattern.startsWith(endpoint.split('/:')[0])) {
        return payload;
      }
    }
  }
  
  // Default minimal payload
  return { test: true };
}

async function testEndpoint(baseURL, endpoint, method) {
  try {
    const opts = { method };
    
    // Add appropriate body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      const payload = getTestPayload(endpoint);
      opts.headers = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': baseURL // Add origin header to help with CORS
      };
      opts.body = JSON.stringify(payload);
    } else {
      opts.headers = { 
        'Accept': 'application/json',
        'Origin': baseURL // Add origin header to help with CORS
      };
    }
    
    // For DELETE requests, a minimal body can help
    if (method === 'DELETE') {
      opts.headers = { 'Content-Type': 'application/json' };
    }
    
    // Set a timeout to avoid hanging on slow responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    opts.signal = controller.signal;
    
    const response = await fetch(`${baseURL}${endpoint}`, opts);
    clearTimeout(timeoutId);
    
    // Improved method detection logic
    const endpointExists = response.status !== 404;
    const methodSupported = 
      response.status < 400 || // Success
      response.status === 405 || // Method Not Allowed
      (method === 'POST' && response.status === 400) || // Bad Request - probably missing required fields
      (method === 'PUT' && response.status === 400) || // Bad Request - probably missing required fields
      (response.status === 401 || response.status === 403); // Auth required but endpoint exists
    
    // Parse response data if possible
    let data = null;
    try {
      if (response.headers.get('content-length') !== '0' && 
          response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      }
    } catch (e) {
      // If JSON parsing fails, just continue without data
    }
    
    return {
      status: response.status,
      method: method,
      supported: methodSupported,
      exists: endpointExists,
      data: data,
      requiresAuth: response.status === 401 || response.status === 403
    };
  } catch (error) {
    // Handle network errors and timeouts
    const isTimeout = error.name === 'AbortError';
    return { 
      error: error.message, 
      exists: isTimeout, // If it timed out, it probably exists
      supported: false,
      requiresAuth: false
    };
  }
}

// Fill in a placeholder value if endpoint has parameters
function getTestableEndpoint(endpoint) {
  let testable = endpoint;
  
  // Handle different parameter patterns
  if (testable.includes(':id')) testable = testable.replace(':id', 'test_id');
  if (testable.includes(':tool_id')) testable = testable.replace(':tool_id', 'trivia');
  if (testable.includes(':key')) testable = testable.replace(':key', 'test_key');
  if (testable.includes(':prefix')) testable = testable.replace(':prefix', 'test');
  if (testable.includes('thread_:id')) testable = testable.replace('thread_:id', 'thread_123');
  
  return testable;
}

// Check if an endpoint likely exists based on similar endpoints or patterns
function guessEndpointExistence(endpoint, knownEndpoints) {
  // If root endpoint exists, subpaths may too
  const parts = endpoint.split('/').filter(Boolean);
  if (parts.length > 1) {
    const parentPath = '/' + parts.slice(0, -1).join('/');
    if (knownEndpoints.has(parentPath)) return true;
  }
  
  // If a parameterized version exists, the specific one might too
  if (endpoint.includes('/')) {
    const lastPart = endpoint.split('/').pop();
    const parentPath = endpoint.substring(0, endpoint.lastIndexOf('/'));
    const parentPathWithParam = `${parentPath}/:id`;
    if (knownEndpoints.has(parentPathWithParam)) return true;
  }
  
  return false;
}

export async function crawlSLOP(baseURL) {
  if (!baseURL.endsWith('/')) baseURL = baseURL + '/';
  
  console.log(`Starting SLOP crawl of ${baseURL}...`);
  
  const api = {};
  const processedEndpoints = new Set();
  const knownEndpoints = new Set();
  const endpointsToExplore = [];
  
  // Start with /info endpoint first to get API metadata if available
  let apiInfo = null;
  try {
    console.log(`Checking for info endpoint at ${baseURL}info...`);
    const infoResult = await testEndpoint(baseURL, '/info', 'GET');
    if (infoResult.exists && infoResult.supported && infoResult.data) {
      apiInfo = infoResult.data;
      console.log(`Found API info: ${apiInfo.name || 'Unnamed API'}, version: ${apiInfo.version || 'unknown'}`);
      
      // Add endpoints from the info data
      if (apiInfo.endpoints && Array.isArray(apiInfo.endpoints)) {
        apiInfo.endpoints.forEach(endpoint => {
          if (endpoint.path) {
            if (!knownEndpoints.has(endpoint.path)) {
              endpointsToExplore.push(endpoint.path);
              knownEndpoints.add(endpoint.path);
            }
          }
        });
      }
    }
  } catch (error) {
    console.log(`Error checking info endpoint: ${error.message}`);
  }
  
  // Add standard SLOP endpoints to explore
  for (const endpoint of SLOP_ENDPOINTS) {
    if (!knownEndpoints.has(endpoint)) {
      endpointsToExplore.push(endpoint);
      knownEndpoints.add(endpoint);
    }
  }
  
  // Also add empty endpoint to discover from root
  endpointsToExplore.push('');
  
  // Process discovered endpoints
  while (endpointsToExplore.length > 0) {
    const endpoint = endpointsToExplore.shift();
    if (processedEndpoints.has(endpoint)) continue;
    processedEndpoints.add(endpoint);
    
    console.log(`Exploring endpoint: ${endpoint}`);
    
    const testableEndpoint = getTestableEndpoint(endpoint);
    api[endpoint] = { methods: [], exists: false };
    
    // If we have info for this endpoint from the /info API, use it
    if (apiInfo && apiInfo.endpoints) {
      const endpointInfo = apiInfo.endpoints.find(e => e.path === endpoint);
      if (endpointInfo) {
        api[endpoint].description = endpointInfo.description;
        api[endpoint].request_format = endpointInfo.request_format;
        api[endpoint].response_format = endpointInfo.response_format;
        api[endpoint].fromInfoEndpoint = true;
        
        // Add the documented method
        if (endpointInfo.method && !api[endpoint].methods.includes(endpointInfo.method)) {
          api[endpoint].methods.push(endpointInfo.method);
        }
      }
    }
    
    // For each endpoint, first try GET to detect existence
    const getResult = await testEndpoint(baseURL, testableEndpoint, 'GET');
    if (getResult.exists) {
      api[endpoint].exists = true;
      if (getResult.supported && !api[endpoint].methods.includes('GET')) {
        api[endpoint].methods.push('GET');
        // Store GET response data if available
        if (getResult.data) {
          api[endpoint].data = getResult.data;
          extractAndQueueEndpoints(getResult.data, endpointsToExplore, processedEndpoints, knownEndpoints);
        }
      }
      if (getResult.requiresAuth) {
        api[endpoint].requiresAuth = true;
      }
    }
    
    // If the endpoint exists or is a standard SLOP endpoint, check other methods
    if (api[endpoint].exists || SLOP_ENDPOINTS.includes(endpoint)) {
      // Get standard methods for this endpoint if available
      const standardMethods = STANDARD_METHODS[endpoint] || [];
      
      for (const method of HTTP_METHODS.filter(m => m !== 'GET')) {
        // Skip methods not in standard methods for this endpoint (if defined)
        if (standardMethods.length > 0 && !standardMethods.includes(method)) {
          continue;
        }
        
        // If we already know this method from the info endpoint, skip testing it
        if (api[endpoint].fromInfoEndpoint && api[endpoint].methods.includes(method)) {
          continue;
        }
        
        const result = await testEndpoint(baseURL, testableEndpoint, method);
        if (result.supported) {
          if (!api[endpoint].methods.includes(method)) {
            api[endpoint].methods.push(method);
          }
          // For POST, also store the response data if available
          if (method === 'POST' && result.data && !api[endpoint].data) {
            api[endpoint].data = result.data;
            extractAndQueueEndpoints(result.data, endpointsToExplore, processedEndpoints, knownEndpoints);
          }
        }
        if (result.requiresAuth) {
          api[endpoint].requiresAuth = true;
        }
      }
      
      // Add standard methods that weren't detected but should be supported
      if (standardMethods.length > 0) {
        for (const method of standardMethods) {
          if (!api[endpoint].methods.includes(method)) {
            api[endpoint].methods.push(method);
            api[endpoint].standardMethod = true;
          }
        }
      }
    }
    
    // Mark SLOP standard endpoints as existing even if we couldn't confirm
    if (!api[endpoint].exists && SLOP_ENDPOINTS.includes(endpoint)) {
      api[endpoint].exists = true;
      api[endpoint].isStandard = true;
    }
    
    // Remove endpoints that couldn't be confirmed to exist
    if (!api[endpoint].exists && !guessEndpointExistence(endpoint, knownEndpoints)) {
      delete api[endpoint];
    }
  }
  
  // Store API metadata at the top level
  if (apiInfo) {
    api._info = {
      name: apiInfo.name,
      description: apiInfo.description,
      version: apiInfo.version,
      url: apiInfo.url,
      scope: apiInfo.scope
    };
  }
  
  console.log(`SLOP crawl complete. Found ${Object.keys(api).length} endpoints.`);
  return api;
}

// Extract potential endpoints from response data and queue them for exploration
function extractAndQueueEndpoints(data, queue, processed, known) {
  // Check for tools
  if (data.tools && Array.isArray(data.tools)) {
    for (const tool of data.tools) {
      if (tool.id) {
        const toolEndpoint = `/tools/${tool.id}`;
        if (!processed.has(toolEndpoint) && !queue.includes(toolEndpoint)) {
          queue.push(toolEndpoint);
          known.add(toolEndpoint);
        }
      }
    }
  }
  
  // Check for resources
  if (data.resources && Array.isArray(data.resources)) {
    for (const resource of data.resources) {
      if (resource.id) {
        const resourceEndpoint = `/resources/${resource.id}`;
        if (!processed.has(resourceEndpoint) && !queue.includes(resourceEndpoint)) {
          queue.push(resourceEndpoint);
          known.add(resourceEndpoint);
        }
      }
    }
  }
  
  // Look for any paths mentioned in the response data
  const paths = findPathsInObject(data);
  for (const path of paths) {
    if (!processed.has(path) && !queue.includes(path)) {
      queue.push(path);
      known.add(path);
    }
  }
}

// Helper to find potential API paths in the data
function findPathsInObject(obj) {
  const paths = new Set();
  
  function traverse(current) {
    if (!current) return;
    
    if (typeof current === 'string') {
      // Check if string looks like an API path (starts with / and contains more than just /)
      if (current.startsWith('/') && current.length > 1 && !current.includes('://')) {
        paths.add(current);
      }
      return;
    }
    
    if (typeof current !== 'object') {
      return;
    }
    
    if (Array.isArray(current)) {
      for (const item of current) {
        traverse(item);
      }
      return;
    }
    
    for (const [key, value] of Object.entries(current)) {
      traverse(value);
    }
  }
  
  traverse(obj);
  return Array.from(paths);
} 