const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const githubAuthConfig = require('../.config/githubAuth');
const googleAuthConfig = require('../.config/googleAuth');
const { checkExistedUser, signupGoogle } = require('../dao/userDAO');
const { secretKey } = require('../.config/jwt');
const { options } = require('../.config/jwt');
const cookieOptions = require('../.config/cookie');

const app = express();

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(
  new GitHubStrategy(githubAuthConfig, (accessToken, refreshToken, profile, cb) => {
    console.log(profile);
    // checkExistedUser(profile);
    cb(null, profile);
  })
);

passport.use(
  new GoogleStrategy(googleAuthConfig, async (accessToken, refreshToken, profile, cb) => {
    const [currentUser] = await checkExistedUser(profile._json);
    if (currentUser) return cb(null, { isExisted: true, currentUser });
    return cb(null, { isExisted: false, profile });
  })
);

app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/signin_error' }),
  async (req, res) => {
    if (req.user.isExisted) {
      const { name, email } = req.user.currentUser;
      const token = jwt.sign({ email, name }, secretKey, options);
      res.cookie('auth_token', token, cookieOptions);
    } else {
      const { name, picture: profile_photo, email } = req.user.profile._json;
      const signupResult = await signupGoogle({ email, name, profile_photo });
      if (signupResult.affectedRows) {
        const token = jwt.sign({ email, name }, secretKey, options);
        res.cookie('auth_token', token, cookieOptions);
      } else {
        return res.redirect('http://localhost:3000/signup_error');
      }
    }
    res.redirect('http://localhost:3000');
  }
);

app.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: 'http://localhost:3000/signin_error',
  }),
  (req, res) => {
    console.log(req);
    res.redirect('http://localhost:3000');
  }
);

module.exports = app;