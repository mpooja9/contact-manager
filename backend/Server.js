const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Set up MongoDB connection
mongoose.connect('mongodb://0.0.0.0:27017/contact-manager-db', { useNewUrlParser: true, useUnifiedTopology: true });

// Define routes and middleware as needed

app.get('/', (req, res) => {
  res.send('Welcome to the Contact Manager App!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
