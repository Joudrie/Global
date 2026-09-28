// Globalio analytics, loaded by every page: the app, the generated content
// pages, privacy and terms. Set an ID to switch that tool on; empty keeps it off.
//
//   GoatCounter: sign up at https://www.goatcounter.com, pick a code (e.g.
//   "globalio"), set GOATCOUNTER_CODE. Stats: https://<code>.goatcounter.com
//   No cookies.
//
//   GA4: analytics.google.com > Admin > Data streams > Web > globalio.app,
//   copy the Measurement ID ("G-XXXXXXXXXX") into GA4_ID. Link it to Google
//   Ads and AdSense from GA4 > Admin > Product links.
(function () {
  var GOATCOUNTER_CODE = ""
  var GA4_ID = ""

  if (GOATCOUNTER_CODE) {
    var gc = document.createElement("script")
    gc.async = true
    gc.src = "https://gc.zgo.at/count.js"
    gc.setAttribute("data-goatcounter", "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count")
    document.head.appendChild(gc)
  }

  if (GA4_ID) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    // Consent Mode v2: cookies stay off in the EEA, UK and Switzerland until the
    // visitor answers Google's consent message (AdSense > Privacy & messaging).
    window.gtag("consent", "default", {
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied",
      region: ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","GB","CH"],
      wait_for_update: 500,
    })
    window.gtag("js", new Date())
    window.gtag("config", GA4_ID)
    var ga = document.createElement("script")
    ga.async = true
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID
    document.head.appendChild(ga)
  }
})()
