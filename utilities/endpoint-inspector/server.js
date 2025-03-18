import express from 'express';
import cors from 'cors';
import { crawlSLOP } from './crawler.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

// Proxy endpoint to handle CORS issues
app.all('/proxy/*', async (req, res) => {
  try {
    const targetUrl = req.params[0];
    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    const options = {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    // Forward the body for POST/PUT requests
    if (['POST', 'PUT'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type');
    
    // Forward the response headers
    res.status(response.status);
    if (contentType) {
      res.set('Content-Type', contentType);
    }

    // Handle JSON and non-JSON responses
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      details: error.message
    });
  }
});

app.get('/crawl', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Validate URL format
    new URL(url);
    
    const api = await crawlSLOP(url);
    res.json({
      success: true,
      message: 'API structure discovered successfully',
      data: api,
      crawledUrl: url
    });
  } catch (error) {
    console.error('Error during crawl:', error);
    const errorMessage = error instanceof TypeError && error.message.includes('Invalid URL') 
      ? 'Invalid URL format'
      : error.message;

    res.status(500).json({
      success: false,
      message: 'An error occurred while crawling the API',
      error: errorMessage,
      crawledUrl: url
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}. Open http://localhost:${PORT} in your browser.`);
  console.log(`Proxy endpoint available at http://localhost:${PORT}/proxy/`);
}); 