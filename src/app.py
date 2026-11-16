from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx
from nicegui import ui


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_CODES = {
    0: ("Clear sky", "sunny"),
    1: ("Mostly clear", "partly_cloudy_day"),
    2: ("Partly cloudy", "partly_cloudy_day"),
    3: ("Overcast", "cloud"),
    45: ("Foggy", "foggy"),
    48: ("Rime fog", "foggy"),
    51: ("Light drizzle", "rainy"),
    53: ("Drizzle", "rainy"),
    55: ("Heavy drizzle", "rainy"),
    61: ("Light rain", "rainy"),
    63: ("Rain", "rainy"),
    65: ("Heavy rain", "rainy"),
    71: ("Light snow", "ac_unit"),
    73: ("Snow", "ac_unit"),
    75: ("Heavy snow", "ac_unit"),
    80: ("Rain showers", "rainy"),
    81: ("Rain showers", "rainy"),
    82: ("Heavy showers", "rainy"),
    95: ("Thunderstorm", "thunderstorm"),
}

ATTRIBUTE_LABELS = {
    "is_pant": "Pants",
    "is_long_sleeve_shirt": "Long sleeve",
    "is_short_sleeve_shirt": "Short sleeve",
    "is_short": "Shorts",
    "is_jacket": "Jacket",
    "is_hoodie": "Hoodie",
    "is_breathable": "Breathable",
    "is_warming": "Keeps you warm",
    "is_cooling": "Keeps you cool",
}

WARDROBE: list[dict[str, Any]] = [
    {
        "clothing_name": "Navy rain jacket",
        "is_pant": False,
        "is_long_sleeve_shirt": False,
        "is_short_sleeve_shirt": False,
        "is_short": False,
        "is_jacket": True,
        "is_hoodie": False,
        "is_breathable": True,
        "is_warming": True,
        "is_cooling": False,
    },
    {
        "clothing_name": "Heather gray hoodie",
        "is_pant": False,
        "is_long_sleeve_shirt": False,
        "is_short_sleeve_shirt": False,
        "is_short": False,
        "is_jacket": False,
        "is_hoodie": True,
        "is_breathable": True,
        "is_warming": True,
        "is_cooling": False,
    },
    {
        "clothing_name": "Black joggers",
        "is_pant": True,
        "is_long_sleeve_shirt": False,
        "is_short_sleeve_shirt": False,
        "is_short": False,
        "is_jacket": False,
        "is_hoodie": False,
        "is_breathable": True,
        "is_warming": True,
        "is_cooling": False,
    },
    {
        "clothing_name": "White cotton tee",
        "is_pant": False,
        "is_long_sleeve_shirt": False,
        "is_short_sleeve_shirt": True,
        "is_short": False,
        "is_jacket": False,
        "is_hoodie": False,
        "is_breathable": True,
        "is_warming": False,
        "is_cooling": True,
    },
]

APP_STATE = {"page": "dashboard", "location": "New York, NY", "weather": None, "logged_in": False}


def weather_summary(code: int) -> tuple[str, str]:
    return WEATHER_CODES.get(code, ("Variable conditions", "cloud"))


def active_attributes(item: dict[str, Any]) -> list[str]:
    return [
        label
        for key, label in ATTRIBUTE_LABELS.items()
        if item.get(key, False)
    ]


def choose_outfit(weather: dict[str, Any] | None) -> list[dict[str, Any]]:
    temperature = weather["temperature"] if weather else 58
    rain = weather["precipitation_probability"] if weather else 20
    if temperature < 55 or rain >= 45:
        preferred = ["is_warming", "is_jacket", "is_hoodie", "is_pant"]
    elif temperature >= 72:
        preferred = ["is_cooling", "is_breathable", "is_short_sleeve_shirt", "is_short"]
    else:
        preferred = ["is_breathable", "is_long_sleeve_shirt", "is_pant"]

    selected: list[dict[str, Any]] = []
    for attribute in preferred:
        match = next((item for item in WARDROBE if item.get(attribute) and item not in selected), None)
        if match:
            selected.append(match)
    return selected[:3]


async def load_weather() -> None:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                OPEN_METEO_URL,
                params={
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
                    "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
                    "temperature_unit": "fahrenheit",
                    "wind_speed_unit": "mph",
                    "timezone": "auto",
                    "forecast_days": 7,
                },
            )
            response.raise_for_status()
            payload = response.json()
            current = payload["current"]
            daily = payload["daily"]
            code = int(current["weather_code"])
            APP_STATE["weather"] = {
                "temperature": round(current["temperature_2m"]),
                "feels_like": round(current["apparent_temperature"]),
                "wind": round(current["wind_speed_10m"]),
                "condition": weather_summary(code)[0],
                "icon": weather_summary(code)[1],
                "precipitation_probability": daily["precipitation_probability_max"][0] or 0,
                "daily": [
                    {
                        "date": datetime.fromisoformat(day).strftime("%a"),
                        "high": round(high),
                        "low": round(low),
                        "condition": weather_summary(int(code))[0],
                        "icon": weather_summary(int(code))[1],
                    }
                    for day, high, low, code in zip(
                        daily["time"],
                        daily["temperature_2m_max"],
                        daily["temperature_2m_min"],
                        daily["weather_code"],
                    )
                ],
            }
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        APP_STATE["weather"] = {
            "temperature": 58,
            "feels_like": 56,
            "wind": 9,
            "condition": "Partly cloudy",
            "icon": "partly_cloudy_day",
            "precipitation_probability": 20,
            "daily": [
                {"date": day, "high": high, "low": low, "condition": "Partly cloudy", "icon": "partly_cloudy_day"}
                for day, high, low in [("Today", 61, 52), ("Tue", 63, 53), ("Wed", 59, 49), ("Thu", 57, 48), ("Fri", 62, 51), ("Sat", 65, 54), ("Sun", 64, 52)]
            ],
        }


def add_tag(text: str, color: str = "blue-1") -> None:
    ui.label(text).classes(f"rounded-full bg-{color} px-3 py-1 text-xs font-medium text-slate-700")


def render_shell(content: ui.element) -> None:
    with ui.header().classes("items-center justify-between bg-white px-8 py-4 shadow-sm"):
        with ui.row().classes("items-center gap-3"):
            ui.icon("cloud", color="blue-7").classes("text-3xl")
            ui.label("WeatherGo").classes("text-2xl font-bold text-slate-900")
        with ui.row().classes("items-center gap-4"):
            ui.label("Demo account").classes("text-sm text-slate-500")
            ui.avatar("ES", color="blue-7", text_color="white")

    with ui.left_drawer(value=True).classes("bg-slate-950 p-4"):
        ui.label("YOUR CLOSET, SMARTER").classes("mb-8 text-xs font-semibold tracking-widest text-slate-400")
        for page, icon, label in [
            ("dashboard", "dashboard", "My wardrobe"),
            ("add", "add_circle", "Add to wardrobe"),
            ("weather", "wb_sunny", "Today's outfit"),
        ]:
            ui.button(
                label,
                icon=icon,
                on_click=lambda page=page: navigate(page),
            ).props("flat").classes(
                "mb-2 w-full justify-start text-left text-white hover:bg-slate-800"
            )
        ui.separator().classes("my-6 bg-slate-700")
        ui.label("Backend features such as accounts and passwords will be connected in a later sprint.").classes(
            "text-xs leading-5 text-slate-500"
        )
    content.clear()
    with content:
        with ui.column().classes("mx-auto w-full max-w-7xl gap-8 p-8"):
            render_page()


def navigate(page: str) -> None:
    APP_STATE["page"] = page
    render_shell(MAIN_CONTENT)


def enter_demo_app() -> None:
    APP_STATE["logged_in"] = True
    render_shell(MAIN_CONTENT)


def render_login() -> None:
    MAIN_CONTENT.clear()
    with MAIN_CONTENT:
        with ui.row().classes("min-h-screen w-full items-center justify-center bg-slate-950 p-6"):
            with ui.card().classes("w-full max-w-md border-0 p-8 shadow-xl"):
                with ui.row().classes("mb-8 items-center gap-3"):
                    ui.icon("cloud", color="blue-7").classes("text-4xl")
                    ui.label("WeatherGo").classes("text-3xl font-bold text-slate-900")
                ui.label("Dress for the day ahead.").classes("text-2xl font-bold text-slate-900")
                ui.label("Sign in to get weather-smart outfit suggestions from your own wardrobe.").classes(
                    "mt-2 text-slate-500"
                )
                email = ui.input("Email", placeholder="you@example.com").classes("mt-6 w-full")
                password = ui.input("Password", password=True, password_toggle_button=True).classes("w-full")
                ui.button("Sign in", on_click=enter_demo_app).props("unelevated").classes(
                    "mt-4 w-full bg-blue-7 text-white"
                )
                with ui.row().classes("mt-6 w-full items-center gap-2"):
                    ui.separator().classes("flex-1")
                    ui.label("or").classes("text-xs text-slate-400")
                    ui.separator().classes("flex-1")
                ui.button("Create an account", on_click=enter_demo_app).props("outline").classes(
                    "mt-4 w-full border-blue-7 text-blue-7"
                )
                ui.label("Demo mode: account persistence and passwords arrive in a later sprint.").classes(
                    "mt-6 text-center text-xs leading-5 text-slate-400"
                )


def render_page() -> None:
    page = APP_STATE["page"]
    if page == "add":
        render_add_page()
    elif page == "weather":
        render_weather_page()
    else:
        render_dashboard()


def render_dashboard() -> None:
    with ui.row().classes("w-full items-end justify-between"):
        with ui.column().classes("gap-1"):
            ui.label("Good morning, Esteban").classes("text-3xl font-bold text-slate-900")
            ui.label("Here is what is in your closet today.").classes("text-slate-500")
        ui.button("Add to wardrobe", icon="add", on_click=lambda: navigate("add")).props("unelevated").classes(
            "bg-blue-7 text-white"
        )

    with ui.row().classes("w-full items-start gap-8"):
        with ui.card().classes("w-1/4 min-w-64 border-0 shadow-sm"):
            ui.label("YOUR PROFILE").classes("text-xs font-semibold tracking-widest text-slate-400")
            with ui.row().classes("mt-4 items-center gap-4"):
                ui.avatar("ES", color="blue-7", text_color="white").classes("text-2xl")
                with ui.column().classes("gap-0"):
                    ui.label("Esteban").classes("text-lg font-semibold")
                    ui.label("Weather-ready since today").classes("text-sm text-slate-500")
            ui.separator().classes("my-5")
            ui.label("Wardrobe overview").classes("font-semibold")
            ui.label(f"{len(WARDROBE)} pieces ready to wear").classes("mt-1 text-sm text-slate-500")
            with ui.row().classes("mt-4 gap-2"):
                add_tag("Smart suggestions", "blue-1")

        with ui.column().classes("flex-1 gap-4"):
            with ui.row().classes("w-full items-center justify-between"):
                ui.label("My wardrobe").classes("text-xl font-semibold text-slate-900")
                ui.label(f"{len(WARDROBE)} items").classes("text-sm text-slate-500")
            with ui.grid(columns=2).classes("w-full gap-4"):
                for item in WARDROBE:
                    render_clothing_card(item)


def render_clothing_card(item: dict[str, Any]) -> None:
    with ui.card().classes("border-0 shadow-sm transition hover:shadow-md"):
        with ui.row().classes("w-full items-start justify-between"):
            with ui.column().classes("gap-1"):
                ui.label(item["clothing_name"]).classes("text-lg font-semibold")
                ui.label("Clothing item").classes("text-sm text-slate-500")
            ui.icon("checkroom", color="blue-7").classes("text-2xl")
        with ui.row().classes("mt-4 flex-wrap gap-2"):
            for label in active_attributes(item):
                add_tag(label)


def render_add_page() -> None:
    ui.label("Add to your wardrobe").classes("text-3xl font-bold text-slate-900")
    ui.label("Tell WeatherGo about a real piece of clothing you own.").classes("text-slate-500")
    with ui.card().classes("w-full max-w-3xl border-0 shadow-sm"):
        name = ui.input("Clothing name", placeholder="e.g. Green waterproof jacket").classes("w-full")
        ui.label("What describes this item?").classes("mt-5 font-semibold")
        with ui.grid(columns=3).classes("w-full gap-2"):
            checks = {
                key: ui.checkbox(label)
                for key, label in ATTRIBUTE_LABELS.items()
            }
        with ui.row().classes("mt-6 gap-3"):
            ui.button("Save to wardrobe", icon="check", on_click=lambda: save_item(name, checks)).props(
                "unelevated"
            ).classes("bg-blue-7 text-white")
            ui.button("Cancel", on_click=lambda: navigate("dashboard")).props("flat").classes("text-slate-600")


def save_item(name: ui.input, checks: dict[str, ui.checkbox]) -> None:
    item_name = (name.value or "").strip()
    if not item_name:
        ui.notify("Give this clothing item a name first.", type="warning")
        return
    WARDROBE.append(
        {
            "clothing_name": item_name,
            **{key: bool(check.value) for key, check in checks.items()},
        }
    )
    ui.notify(f"{item_name} was added to your wardrobe.", type="positive")
    navigate("dashboard")


def render_weather_page() -> None:
    weather = APP_STATE["weather"]
    if weather is None:
        ui.label("Loading weather...").classes("text-slate-500")
        return
    outfit = choose_outfit(weather)
    ui.label("Today's outfit").classes("text-3xl font-bold text-slate-900")
    ui.label("A recommendation based on your wardrobe and current conditions.").classes("text-slate-500")
    with ui.row().classes("w-full items-stretch gap-6"):
        with ui.card().classes("flex-1 border-0 bg-blue-7 text-white shadow-sm"):
            with ui.row().classes("items-center justify-between"):
                with ui.column().classes("gap-1"):
                    ui.label(APP_STATE["location"]).classes("text-sm opacity-80")
                    ui.label(f"{weather['temperature']}°").classes("text-6xl font-bold")
                    ui.label(weather["condition"]).classes("text-lg")
                ui.icon(weather["icon"], color="white").classes("text-6xl")
            ui.separator().classes("my-4 opacity-30")
            with ui.row().classes("gap-8 text-sm"):
                ui.label(f"Feels like {weather['feels_like']}°")
                ui.label(f"Wind {weather['wind']} mph")
                ui.label(f"{weather['precipitation_probability']}% rain")
        with ui.card().classes("w-2/5 border-0 shadow-sm"):
            with ui.row().classes("w-full items-center justify-between"):
                ui.label("Your recommended outfit").classes("font-semibold")
                add_tag("Weather matched", "green-1")
            for item in outfit:
                with ui.row().classes("mt-4 items-center gap-3"):
                    ui.icon("checkroom", color="blue-7")
                    with ui.column().classes("gap-0"):
                        ui.label(item["clothing_name"]).classes("font-medium")
                        ui.label(", ".join(active_attributes(item)[:2])).classes("text-xs text-slate-500")
    with ui.row().classes("w-full items-start gap-6"):
        with ui.card().classes("flex-1 border-0 shadow-sm"):
            ui.label("7-day forecast").classes("mb-4 text-xl font-semibold")
            with ui.row().classes("w-full justify-between gap-2"):
                for day in weather["daily"]:
                    with ui.column().classes("items-center gap-2 rounded-xl bg-slate-50 px-3 py-4"):
                        ui.label(day["date"]).classes("text-xs font-semibold text-slate-500")
                        ui.icon(day["icon"], color="blue-7").classes("text-2xl")
                        ui.label(f"{day['high']}°").classes("font-semibold")
                        ui.label(f"{day['low']}°").classes("text-xs text-slate-500")
        with ui.card().classes("w-2/5 border-0 shadow-sm"):
            with ui.row().classes("w-full items-center justify-between"):
                ui.label("Weather radar").classes("text-xl font-semibold")
                ui.icon("radar", color="blue-7")
            ui.html(
                '<div class="mt-4 flex h-36 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_60%_40%,#93c5fd,transparent_35%),linear-gradient(135deg,#dbeafe,#eff6ff)]">'
                '<div class="rounded-full border-4 border-blue-500/40 p-8"><span class="text-sm font-medium text-blue-900">Live radar area</span></div></div>'
            )
            ui.link(
                "Open live radar on Windy",
                "https://www.windy.com/40.712/-74.006",
                new_tab=True,
            ).classes("mt-3 text-sm text-blue-700")
            ui.label("Forecast data powered by Open-Meteo.").classes("mt-2 text-xs text-slate-400")


@ui.page("/")
async def index() -> None:
    await load_weather()
    ui.add_head_html(
        """
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        </style>
        """
    )
    global MAIN_CONTENT
    MAIN_CONTENT = ui.column().classes("w-full")
    if APP_STATE["logged_in"]:
        render_shell(MAIN_CONTENT)
    else:
        render_login()


if __name__ in {"__main__", "__mp_main__"}:
    ui.run(title="WeatherGo", reload=False, favicon="☁️")
