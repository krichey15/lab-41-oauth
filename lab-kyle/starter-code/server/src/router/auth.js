 'use strict'

import {Router} from 'express';
import User from '../model/user.js';
import bodyParser from 'body-parser';
import basicAuth from '../middleware/basic-auth.js';
import superagent from 'superagent';

let URL = process.env.CLIENT_URL

export default new Router()

    .post('/signup', bodyParser.json() , (req, res, next) => {

        new User.createFromSignup(req.body)
            .then(user => user.tokenCreate())
            .then(token => {
                res.cookie('X-BBB-Token', token);
                res.send(token);
            })
            .catch(next);
    })

    .get('/usernames/:username', (req, res, next) => {

        User.findOne({username: req.params.username})
            .then(user => {
                if(!user) {
                    return res.sendStatus(200);
                }
                return res.sendStatus(409);
            })
            .catch(next);
    })

    .get('/login', basicAuth, (req, res, next) => {

        req.user.tokenCreate()
            .then((token) => {
                res.cookie('X-BBB-Token', token);
                res.send(token);
            })
            .catch(next);
    })

    .get('/oauth/google/code', (req, res, next) => {
      console.log('(1)code:',req.query.code);
      let code = req.query.code
      superagent.post('https://www.googleapis.com/oauth2/v4/token')
        .type('form')
        .send({
          code: code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri:`${process.env.API_URL}/oauth/google/code`,
          grant_type:'authorization_code'
        })
        .then(response => {
          let googleToken = response.body.access_token
          console.log('(2) token', googleToken);
          return googleToken;
        })
        .then(token => {
          superagent.get('https://www.googleapis.com/plus/v1/people/me/openIdConnect')
            .set('Authurization', `Bearer ${token}`)
            .then(response => {
              let user = response.body
              console.log('(4) google user', user);
              return user;
            })
          console.log('(3) token', token);
        })
        .then(googleUser => {
          console.log(googleUser);
          return User.createFromOAuth(googleUser)
            .then(user => {
              console.log('(5) logged in');
              res.redirect(URL);
            })

        })
        .catch(err => {
          console.error(err);
          res.redirect(URL);
        })

    //  res.redirect(URL);
    })

;
