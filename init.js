function $(selector, root = document) {
  return root.querySelector(selector);
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const merd = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 -> 12
  const mm = minutes.toString().padStart(2, "0");
  return `${hours}:${mm}<span class="merd">${merd}</span>`;
}

function formatDate(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthName = months[date.getMonth()];
  const day = date.getDate();
  const ordinal = (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return "st";
    if (n % 10 === 2 && n % 100 !== 12) return "nd";
    if (n % 10 === 3 && n % 100 !== 13) return "rd";
    return "th";
  }
  return `${day}${ordinal(day)} ${monthName}`;
}

function formatDay(date) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayName = days[date.getDay()];
  return dayName;
}

function nearestPastMinuteEndingIn5(minute) {
  // subtract remainder modulo 10, then add 5 if result > current minute
  let base = minute - (minute % 10) + 5;
  if (base > minute) base -= 10;
  if (base < 5) base = 5; // clamp to 5 if below
  return base;
}

async function updateClock() {
  const now = new Date();
  const minutes = now.getMinutes();

  $(".time").innerHTML = formatTime(now);
  $(".day").innerHTML = formatDay(now);
  $(".date").innerHTML = formatDate(now);

  const h = now.getHours();
  $(".left").classList.remove("dimmer-night","dimmer-late-night","dimmer-day");
  $(".weather").classList.remove("dimmer-night-img","dimmer-late-night-img","dimmer-day-img");

  // midnight to 6am
  if (h >= 0 && h < 6) {
    $(".left").classList.add("dimmer-late-night");
    $(".weather").classList.add("dimmer-late-night-img");
    try {
      window.WebviewKioskBrightnessInterface.setBrightness(2);
    } catch (error) {
    }
  // after 9pm
  } else if (h >= 21) {
    $(".left").classList.add("dimmer-night");
    $(".weather").classList.add("dimmer-night-img");
    try {
      window.WebviewKioskBrightnessInterface.setBrightness(20);
    } catch (error) {
    }
  // after midday
  } else if (h >= 12) {
    $(".left").classList.add("dimmer-night");
    $(".weather").classList.add("dimmer-night-img");
    try {
      window.WebviewKioskBrightnessInterface.setBrightness(50);
    } catch (error) {
    }
  // from 8am to midday
  } else if (h >= 8) {
    $(".left").classList.add("dimmer-day");
    $(".weather").classList.add("dimmer-day-img");
    try {
      window.WebviewKioskBrightnessInterface.setBrightness(80);
    } catch (error) {
    }
  // from 6am to 8am
  } else if (h >= 6) {
    $(".left").classList.add("dimmer-day");
    $(".weather").classList.add("dimmer-day-img");
    try {
      window.WebviewKioskBrightnessInterface.setBrightness(30);
    } catch (error) {
    }
  }

  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(2); // last two digits
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = (minutes -1).toString().padStart(2, '0');

  // Image updates every 10 minutes, on the minute ending in 5
  if (minutes.toString().slice(-1) === "6") {
    var url = `http://www.baywx.com.au/WWW/melbtemp2${day}${month}${year}${hour}${minute}.png`;
  } else {
    const m = nearestPastMinuteEndingIn5(minute);
    var url = `http://www.baywx.com.au/WWW/melbtemp2${day}${month}${year}${hour}${m}.png`;
  }

  // http://www.baywx.com.au/WWW/melbtemp22302261545.png
  if ($(".weather").src != url) {
    const exists = await fileExists(url);
    if (exists) {
      console.log(`Fetching: ${url}`);
      $(".weather").src = url;
    }
  }
}

// Automatic page+css+js refresh every so often
function bustAssets(stamp) {
  // Stylesheets
  const styles = document.querySelectorAll('link[rel="stylesheet"]');
  styles.forEach(link => {
    const url = new URL(link.href, location.origin);
    url.searchParams.set('_', stamp);
    link.href = url.toString();
  });

  // Scripts
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(oldScript => {
    const url = new URL(oldScript.src, location.origin);
    url.searchParams.set('_', stamp);
    const newScript = document.createElement('script');
    newScript.src = url.toString();
    newScript.async = false;
    oldScript.parentNode.insertBefore(newScript, oldScript);
    oldScript.remove();
  });
}

function hardRefresh() {
  const stamp = Date.now();
  bustAssets(stamp);

  // Small delay to let new assets start loading
  setTimeout(() => {
    const url = new URL(location.href);
    url.searchParams.set('_', stamp);
    location.replace(url.toString());
  }, 500);
}

async function getWeather() {
  // https://api.weather.bom.gov.au/v1/locations?search=melbourne
  const loc = "r1r0ghr";  // east melb
  const res = await fetch(
    `https://api.weather.bom.gov.au/v1/locations/${loc}/forecasts/daily`
  );

  if (!res.ok) {
    throw new Error("Network response failed");
  }

  const json = await res.json();
  const day1 = json.data[0];
  const day2 = json.data[1];
  const day3 = json.data[2];
  const day4 = json.data[3];

  console.log(day2);
  const rainChance = day1.rain?.chance ?? 0;
  const maxRain = day1.rain?.amount?.max ?? 0;


  // `https://api.weather.bom.gov.au/v1/locations/${loc}/observations`
  const res2 = await fetch("https://api.weather.bom.gov.au/v1/locations/r1r0fs/observations");
  const json2 = await res2.json();
  const temp = json2.data?.temp;          // air temperature (°C)
  const feelsLike = json2.data?.temp_feels_like; // apparent temperature (°C)

  return {
    "likely": rainChance > 50,
    "percent": rainChance,
    "rainfall": maxRain,
    desc: day1.short_text,
    max: day1.temp_max,
    min: day1.temp_min,
    icon: await getIcon(day1.icon_descriptor.replace("_", "-")),
    temp: temp,
    feels: feelsLike,

    daylabel2: new Date(day2.date).toLocaleDateString("en-AU", { weekday: "short" }),
    desc2: day2.short_text,
    max2: day2.temp_max,
    min2: day2.temp_min,
    icon2: await getIcon(day2.icon_descriptor.replace("_", "-")),

    daylabel3: new Date(day3.date).toLocaleDateString("en-AU", { weekday: "short" }),
    desc3: day3.short_text,
    max3: day3.temp_max,
    min3: day3.temp_min,
    icon3: await getIcon(day3.icon_descriptor.replace("_", "-")),

    daylabel4: new Date(day4.date).toLocaleDateString("en-AU", { weekday: "short" }),
    desc4: day4.short_text,
    max4: day4.temp_max,
    min4: day4.temp_min,
    icon4: await getIcon(day4.icon_descriptor.replace("_", "-"))

  }
}

async function getIcon(icon) {
  const res = await fetch(`/img/icon-${icon}.svg`);
  if (!res.ok) throw new Error("Failed to fetch SVG");
  const svgText = await res.text();
  return svgText;
}

async function updateRain() {
  const r = await getWeather();
  $(".weathernow").innerHTML = `<span class="weathericon">${r.icon}</span>${r.max}&deg;-${r.min}&deg; <span class="tiny">Now: ${r.temp}&deg;</span>`
  $(".weatherdesc").innerHTML = `<b>${r.desc}</b>`;
  $(".weatherrain").innerHTML = `Rain: ${r.rainfall}mm/${r.percent}%`;
  $(".weathertomor").innerHTML = `
    <span class="tinyday">${r.daylabel2}</span> <span class="weathericon">${r.icon2}</span> ${r.max2}&deg;-${r.min2}&deg; ${r.desc2}<br>
    <span class="tinyday">${r.daylabel3}</span> <span class="weathericon">${r.icon3}</span> ${r.max3}&deg;-${r.min3}&deg; ${r.desc3}<br>
    <span class="tinyday">${r.daylabel4}</span> <span class="weathericon">${r.icon4}</span> ${r.max4}&deg;-${r.min4}&deg; ${r.desc4}<br>`;
}

function fileExists(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  updateRain();
  setInterval(updateClock, 10000);
  setInterval(updateRain, 20 * 60 * 1000); // 20 minutes
  const INTERVAL = 60 * 60 * 1000; // 30 minutes
  setInterval(hardRefresh, INTERVAL);
});
