/**
 * Web server configuration.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import express from "express";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";

// Imports routes
import indexRouter from "./routes/index.route.js";

const expressApp = express();

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
			response.render("error");
		}
	});
});

export default expressApp;
