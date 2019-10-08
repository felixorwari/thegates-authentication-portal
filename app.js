var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var session = require('express-session');

// Import Okta SDK and middleware
var okta = require("@okta/okta-sdk-nodejs");
var ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;

// Import custom application routes
const dashboardRouter = require("./routes/dashboard");
const publicRouter = require("./routes/public");
const usersRouter = require("./routes/users");

var app = express();
// Create a client to use Okta API
var oktaClient = new okta.Client({
    orgUrl: 'https://dev-155628.okta.com',
    token: '00O52U8QG530dnVXvU1ELiW-Vc16SJstLiE0n4HZfp'
});
const oidc = new ExpressOIDC({
    issuer: "https://dev-155628.okta.com/oauth2/default",
    client_id: "0oa1j8lvtrplzYYRA357",
    client_secret: "_lSTK535LLt11pM1XaqHBpgmWbJmyISfc8Oh7sXS",
    redirect_uri: 'http://localhost:5000/users/callback',
    scope: "openid profile",
    routes: {
        login: {
            path: "/users/login"
        },
        callback: {
            path: "/users/callback",
            defaultRedirect: "/dashboard"
        }
    }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
// Enable session management
app.use(session({
    secret: 'vdakdfv0923fkvccxvqwASD124tgsdv6as09092rqgadfvjq34r89fsdvzxcviqevsd92',
    resave: true,
    saveUninitialized: false
}));

// Enable OpenID Connect routes
app.use(oidc.router);

// Middleware to fetch additional data for the current user
app.use((req, res, next) => {
    if (!req.userinfo) {
        return next();
    }

    oktaClient.getUser(req.userinfo.sub)
        .then(user => {
            req.user = user;
            res.locals.user = user;
            next();
        }).catch(err => {
            next(err);
        });
});
// TEST: Show user profile
app.get('/test', (req, res) => {
    res.json({ profile: req.user ? req.user.profile : null });
});

// Middleware to allow only logged in users
function loginRequired(req, res, next) {
    if (!req.user) {
        return res.status(401).render("unauthenticated");
    }

    next();
}

// Register custom app routes
app.use('/', publicRouter);
app.use('/dashboard', loginRequired, dashboardRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;