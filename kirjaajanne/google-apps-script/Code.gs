/**
 * Bugiraportointijärjestelmän Backend (Google Apps Script Web App)
 * 
 * Vastaanottaa JSON-payloadin (doPost) frontend-sovellukselta ja luo
 * uuden bugitikan Kanban-tauluun (Trello / Notion API).
 * 
 * Turvallisuus: Kaikki API-avaimet ja lista-ID:t haetaan Script Properties -asetuksista.
 */

function doPost(e) {
  try {
    // 1. Tarkistetaan että payload on olemassa
    if (!e || !e.postData || !e.postData.contents) {
      return respondJSON({ status: "error", message: "Missing request payload" }, 400);
    }

    // 2. Parsetaan JSON-payload
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return respondJSON({ status: "error", message: "Invalid JSON payload" }, 400);
    }

    var userText = payload.userText || "Ei ongelmakuvausta";
    var deviceInfo = payload.deviceInfo || {};
    var actionLogs = payload.actionLogs || [];

    // Poimitaan sovelluksen versio otsikkoa varten
    var appVersion = deviceInfo.appVersion || deviceInfo.version || "v1.0.0";
    var shortSummary = userText.length > 50 ? userText.substring(0, 50) + "..." : userText;
    var title = "[Bug " + appVersion + "] " + shortSummary;

    // 3. Muutoillaan selkeä Markdown-kuvaus tiketille
    var description = formatTicketDescription(userText, deviceInfo, actionLogs);

    // 4. Luodaan tiketti Trelloon (tai Notioniiin)
    var result = createTrelloCard(title, description);

    return respondJSON({
      status: "success",
      message: "Bugiraportti vastaanotettu ja tiketti luotu onnistuneesti",
      ticketUrl: result.url || null,
      cardId: result.id || null
    }, 200);

  } catch (err) {
    Logger.log("Virhe doPost-käsittelyssä: " + err.toString());
    return respondJSON({
      status: "error",
      message: err.toString()
    }, 500);
  }
}

/**
 * Muotoilee laitetiedot, lokit ja käyttäjän kuvauksen selkeäksi Markdowniksi.
 */
function formatTicketDescription(userText, deviceInfo, actionLogs) {
  var timestamp = new Date().toISOString();
  
  var text = "### 🐛 Ongelmakuvaus\n";
  text += userText + "\n\n";

  text += "---\n";
  text += "### 📱 Laitetiedot (Device Info)\n";
  if (typeof deviceInfo === "object" && deviceInfo !== null) {
    for (var key in deviceInfo) {
      text += "- **" + key + ":** " + deviceInfo[key] + "\n";
    }
  } else {
    text += deviceInfo + "\n";
  }
  text += "- **Raportoitu (UTC):** " + timestamp + "\n\n";

  text += "---\n";
  text += "### 📋 Toimintalokit (Action Logs)\n";
  if (Array.isArray(actionLogs)) {
    if (actionLogs.length === 0) {
      text += "_Ei lokimerkintöjä_\n";
    } else {
      text += "```json\n" + JSON.stringify(actionLogs, null, 2) + "\n```\n";
    }
  } else if (typeof actionLogs === "object" && actionLogs !== null) {
    text += "```json\n" + JSON.stringify(actionLogs, null, 2) + "\n```\n";
  } else {
    text += "```\n" + actionLogs + "\n```\n";
  }

  return text;
}

/**
 * Luodaan Trello-kortti UrlFetchApp-palvelun avulla.
 * Avaimet haetaan turvallisesti PropertiesService-palvelusta.
 */
function createTrelloCard(title, description) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty("TRELLO_API_KEY");
  var token = props.getProperty("TRELLO_TOKEN");
  var listId = props.getProperty("TRELLO_LIST_ID");

  if (!apiKey || !token || !listId) {
    throw new Error("Trello Script Properties puuttuvat! Varmista että TRELLO_API_KEY, TRELLO_TOKEN ja TRELLO_LIST_ID on asetettu asetuksissa.");
  }

  var url = "https://api.trello.com/1/cards?" +
    "key=" + encodeURIComponent(apiKey) +
    "&token=" + encodeURIComponent(token) +
    "&idList=" + encodeURIComponent(listId) +
    "&name=" + encodeURIComponent(title) +
    "&desc=" + encodeURIComponent(description) +
    "&pos=top";

  var options = {
    method: "post",
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200 && responseCode !== 201) {
    throw new Error("Trello API palautti virheen (" + responseCode + "): " + responseText);
  }

  return JSON.parse(responseText);
}

/**
 * Apufunktio JSON-vastauksen muodostamiseen
 */
function respondJSON(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Testifunktio Apps Script -editorissa suoraan ajettavaksi (Debugging)
 */
function testDoPostLocally() {
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        userText: "Testi: Sanelu pysähtyi eikä sovellus reagoi nappeihin.",
        deviceInfo: {
          os: "Windows 11",
          appVersion: "1.2.0",
          deviceModel: "PC / Chrome 122.0",
          screen: "1920x1080"
        },
        actionLogs: [
          { timestamp: "2026-08-24T17:00:00Z", action: "MIC_START" },
          { timestamp: "2026-08-24T17:00:05Z", action: "AUDIO_CHUNK_REC", size: 1024 },
          { timestamp: "2026-08-24T17:00:10Z", error: "NetworkTimeoutError: /api/transcribe failed" }
        ]
      })
    }
  };

  var res = doPost(mockEvent);
  Logger.log(res.getContent());
}
