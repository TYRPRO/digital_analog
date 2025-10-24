import clock from "clock";
import { battery } from "power";
import * as document from "document";
import { preferences } from "user-settings";
import { HeartRateSensor } from "heart-rate";
import { BodyPresenceSensor } from "body-presence";
import { display } from "display";

function zeroPad(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

// Update the clock every minute
clock.granularity = "seconds";

// Initalisation
const digitalTime = document.getElementById("digitalTime")
const digitalTimeDim = document.getElementById("digitalTimeDim");
const batteryText = document.getElementById("batteryText");
const dayText = document.getElementById("day");
const batteryBar = document.getElementById("batteryBar");
const minute = document.getElementById("minute");
const minutesImage = document.getElementById("minutesImage");
const hour = document.getElementById("hour");
const hoursImage = document.getElementById("hoursImage");
const second = document.getElementById("second");
const secondsImage = document.getElementById("secondsImage");
const dateText = document.getElementById("date");
const dateTextDim = document.getElementById("dateDim");
const background = document.getElementById("background");
const middleCircle = document.getElementById("middleCircle");
const heartRateText = document.getElementById("heartRate");

const hrm = new HeartRateSensor({frequency: 1, batch: 5});
const body = new BodyPresenceSensor();

let hrmStartTimeout;
let globalDisplayOn = true;

const clearHrmTimeout = () => {
  clearTimeout(hrmStartTimeout);
  hrmStartTimeout = null;
};

// Functions
const sixtyToAngle = (value) => {
  return (360 / 60) * value;
};

const hoursToAngle = (hours, minutes) => {
  let hourAngle = (360 / 12) * hours;
  let minAngle = (360 / 12 / 60) * minutes;
  return hourAngle + minAngle;
};

const calculateBatteryBar = (batteryLevel) => {
  return (360 / 100) * batteryLevel;
};

const resetHeartRateText = () => {
  heartRateText.text = `--`;
};

const setBatteryLevel = () => {
  let batteryLevel = Math.floor(battery.chargeLevel);
  batteryText.text = `${batteryLevel}`;
  batteryBar.sweepAngle = calculateBatteryBar(batteryLevel);
}

//initial setting of battery level
setBatteryLevel();

battery.onchange = () => {
  setBatteryLevel();
};

// Update the element on time tick
clock.ontick = (evt) => {
  const today = evt.date;
  let hours = today.getHours();
  const mins = today.getMinutes();
  const seconds = today.getSeconds();
  const date = today.getDate();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days[today.getDay()];

  let time = "";
  if (preferences.clockDisplay === "12h") {
    // 12h format
    hours >= 12 ? (time = " PM") : (time = " AM");
    hours = hours % 12 || 12;
  } else {
    // 24h format
    hours = zeroPad(hours);
  }

  const paddedMins = zeroPad(mins);
  digitalTime.text = `${hours}:${paddedMins}${time}`;
  digitalTimeDim.text = `${hours}:${paddedMins}${time}`;
  dayText.text = `${day}`;

  dateText.text = `${zeroPad(date)}`;
  dateTextDim.text = `${zeroPad(date)}`;
  minute.groupTransform.rotate.angle = sixtyToAngle(mins);
  hour.groupTransform.rotate.angle = hoursToAngle(hours, mins);
  second.groupTransform.rotate.angle = sixtyToAngle(seconds);
};

// Update on heart rate
if (HeartRateSensor) {
  // hrm.start();
  hrm.onreading = (evt) => {
    heartRateText.text = `${hrm.heartRate ? hrm.heartRate : "--"}`;
  };
} else {
  console.log("This device does NOT have a HeartRateSensor!");
}

// Stop sensor on wrist off
if (BodyPresenceSensor) {
  body.start();
  try {
    body.onreading = () => {
      clearHrmTimeout()
      if (!body.present) {
        hrm.stop();
        resetHeartRateText();
      } else {
        hrmStartTimeout = setTimeout(() => {
          globalDisplayOn && hrm.start();
        }, 2000);
      }
    };
  } catch (e) {
    console.log(e);
  }
}

// Change screen elements for AOD/Sleep
if (display.aodAvailable) {
  // tell the system we support AOD
  display.aodAllowed = true;

  // remove listener on heart rate
  display.addEventListener("change", () => {
    if (!display.aodActive && display.on) {
      clock.granularity = "seconds";
      globalDisplayOn = true;
      
      // resume sensors
      body.start(); // resume body presence tracking

      // show previously hidden data
      batteryBar.class = "show";
      batteryText.class = "show";
      heartRateText.class = "show";
      digitalTime.class = "lit";
      secondsImage.href = "second.png";

      // revert dimmed components
      dayText.class = "lit";
      dateText.class = "lit";
      middleCircle.class = "lit";

      // hide thinner dimmed elements for AOD
      digitalTimeDim.class = "hide";
      dateTextDim.class = "hide";

      // revert back to lit resources
      background.href = `background.png`;
      minutesImage.href = 'minute.png'
      hoursImage.href = 'hour.png'

    } else {
      display.aodActive && (clock.granularity = "minutes");
      globalDisplayOn = false;
      secondsImage.href = ""; // hide seconds hand
      // pause sensors
      body.stop();
      clearHrmTimeout(hrmStartTimeout);
      hrm.stop();

      // dim text for AOD
      heartRateText.class = "dim";
      digitalTime.class = "hide";
      digitalTimeDim.class = "dim"
      dateText.class = "hide";
      dateTextDim.class = "dim";
      dayText.class = "dim";
      middleCircle.class = "dim";

      // switch to AOD friendly resources
      background.href = `background_aod.png`;
      minutesImage.href = 'minute_aod.png'
      hoursImage.href = 'hour_aod.png'

      // hide stale data
      batteryText.class = `hide`;
      heartRateText.class = "hide";

      batteryBar.class = "hide";
      display.brightnessOveride = "dim";
    }
  });
}
