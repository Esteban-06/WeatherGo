# WeatherGo

WeatherGo pairs a personal digital wardrobe with a local forecast to help make getting dressed a little easier.

## Run the app

Open the project in VS Code and serve `index.html` with Live Server or another static web server. There is no build step or package installation.

Choose **Explore the demo** on the login screen to try the sample wardrobe, or enter a name and email to create a local demo profile. Add clothing and its weather attributes, upload an optional profile photo, and visit **Weather & outfit** for recommendations, a live radar map, and a seven-day forecast.

Weather and city search use the public [Open-Meteo API](https://open-meteo.com/); the radar is provided by [Windy](https://www.windy.com/). An internet connection is needed for live weather. Profile, wardrobe, and location data are stored in the browser's local storage. Sign-in is a front-end demo and does not authenticate against a server.
