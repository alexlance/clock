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

function updateClock() {
  const now = new Date();
  const minutes = now.getMinutes();

  $(".time").innerHTML = formatTime(now);
  $(".day").innerHTML = formatDay(now);
  $(".date").innerHTML = formatDate(now);

  const h = now.getHours();
  $(".left").classList.remove("dimmer-night","dimmer-late-night","dimmer-day");

  if (h >= 0 && h < 8) {
    $(".left").classList.add("dimmer-late-night");
    $(".weather").classList.add("dimmer-late-night-img");
  } else if (h >= 21) {
    $(".left").classList.add("dimmer-night");
    $(".weather").classList.add("dimmer-night-img");
  } else {
    $(".left").classList.add("dimmer-day");
    $(".weather").classList.add("dimmer-day-img");
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
    console.log(`Fetching: ${url}`);
    $(".weather").src = url;
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

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 10000);
  const INTERVAL = 30 * 60 * 1000; // 30 minutes
  setInterval(hardRefresh, INTERVAL);
});
