require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');

// Middlware mounting
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/public', express.static(`${process.cwd()}/public`));

// Send frontend
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// Create a schema for the URL model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: {
    type: Number,
    index: true,
    unique: true
  }
});
// Create model
const Url = mongoose.model('Url', urlSchema);

// Shorten url and store
app.post('/api/shorturl', (req, res) => {
  let url = req.body.url;

  let host = new URL(url).host;

  dns.lookup(host, async (err) => {
    if (err) {
      console.error(err);
      return res.json({ error: 'invalid url' });
    }
    try {
      // Get short URL value and increment
      const count = await Url.countDocuments({});
      const shortUrlValue = count + 1;

      // Save the URL in MongoDB
      const urlModel = new Url({ original_url: url, short_url: shortUrlValue });
      await urlModel.save();

      res.json({ original_url: url, short_url: shortUrlValue });
    } catch (err) {
      console.error(err);
      res.json({ error: 'internal server error' });
    }
  });
});

// Redirect when recieving shortened url
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  
  // Find url in Database, if found redirect to the original url
  Url.findOne({ short_url: shortUrl }).exec()
    .then ( data => {
    if (data) {
      res.redirect(data.original_url);
    } else {
      res.json({ error: 'Short URL not found' });
    }
  }).catch(err => {
      console.error('Error redirecting:', err.message);
      res.json({ error: 'Internal server error' });
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});