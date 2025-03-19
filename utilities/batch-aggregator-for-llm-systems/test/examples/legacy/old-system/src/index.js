const express = require('express');
const $ = require('jquery');
const _ = require('lodash');

const app = express();
const port = 3000;

// Legacy callback-based code
app.get('/api/users', function(req, res) {
  $.ajax({
    url: 'https://api.example.com/users',
    method: 'GET',
    success: function(data) {
      const processedData = _.map(data, function(user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email
        };
      });
      res.json(processedData);
    },
    error: function(err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// Legacy route handling
app.post('/api/users', function(req, res) {
  const userData = req.body;
  $.ajax({
    url: 'https://api.example.com/users',
    method: 'POST',
    data: userData,
    success: function(response) {
      res.json(response);
    },
    error: function(err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.listen(port, function() {
  console.log(`Legacy server running on port ${port}`);
}); 