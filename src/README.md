# WeatherGo UI prototype

This is a Python/NiceGUI single-page prototype for WeatherGo. It includes:

- A demo login/profile experience
- A wardrobe dashboard with human-readable clothing attributes
- An add-to-wardrobe form
- A weather page with a recommended outfit, seven-day forecast, and live radar link

Authentication, passwords, and database persistence are intentionally deferred
to a later sprint. The prototype uses in-memory demo wardrobe data and fetches
weather from Open-Meteo, with fallback data when the API is unavailable.

## Run locally

From the `src` directory:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Open the URL printed by NiceGUI, usually `http://localhost:8080`.
