const express = require('express');
const { google } = require('googleapis');

const cookieParser = require('cookie-parser');
const exphbs  = require('express-handlebars');

const { authCheck } = require('./middleware/authCheck');
const { googleAuth } = require('./googleAuth');

const app = express();

app.use(cookieParser());

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const youtube = google.youtube({
  version: 'v3',
  auth: googleAuth,
});

app.get('/auth/redirect', async (req, res) => {
  if (!req.query.code) return res.status(400);
  const { tokens } = await googleAuth.getToken(req.query.code);
  res.cookie('google_tokens', tokens, { maxAge: 1000 * 60 * 60, httpOnly: true }).redirect('/dashboard');
});

app.get('/dashboard', authCheck, async (req, res) => {
  res.render('dashboard');
});

app.get('/videos', authCheck, async (req, res) => {
  try {    
    const videos = await youtube.videos.list({ part: 'snippet', myRating: 'like' });
    res.render('videos', { videos: videos.data.items });
  } catch (error) {
    console.error('ERROR - /videos:', error);
  }
});

app.get('/', (req, res) => {
  if (req.cookies.google_tokens) {
    return res.redirect('/dashboard');
  }
  const url = googleAuth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube'],
  });
  return res.render('home', { url });
});

app.get('/logout', (req, res) => {
  return res.clearCookie('google_tokens').redirect('/');
});

app.listen(8080);
