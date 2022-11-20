/**
 * Web server configuration.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import express from "express";
import session from "express-session";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import passport from "passport";
import authentication from "./authentication/authentication.js";

// Imports routes
import indexRouter from "./routes/index.route.js";
import gifRouter from "./routes/gif.route.js";

const expressApp = express();

// Configure login sessions.
expressApp.set("trust proxy", 1);
expressApp.use(session({
	secret: process.env.EXPRESS_SECRET,
	name: process.env.EXPRESS_NAME,
	resave: true,
	saveUninitialized: true
}));
authentication(passport);
expressApp.use(passport.initialize());
expressApp.use(passport.session());

// View engine setup
expressApp.set("views", "./views");
expressApp.set("view engine", "ejs");

expressApp.use(logger("dev"));

// Configure app to allow types of POST data.
expressApp.use(express.json());
expressApp.use(express.urlencoded({
	type: ["application/x-www-form-urlencoded"],
	extended: true,
	limit: "1mb"
}));
expressApp.use(cookieParser());

// Make static document resources available to views (i.e. css, client-side js, images, etc.).
expressApp.use(express.static("./public"));

// Configure routes
expressApp.use("/", indexRouter);
expressApp.use("/gif", gifRouter);

// Catch 404 and forward to error handler.
expressApp.use(function(request, response, next) {
	next(createError(404));
});
// Error handler.
expressApp.use(function(error, request, response, next) {
	// Set locals, only providing error in development
	response.locals.message = error.message;
	response.locals.error = process.env.ENV === "development" ? error : {};

	// Render the error page
	response.status(error.status || 500);
	response.format({
		json: function() {
			response.json({status: error.status, detail: error.message});
		},
		html: function() {
			response.render("pages/error", {error: error});
		}
	});
});

export default expressApp;
