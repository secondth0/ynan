const APPLICATION_SHEET_NAME = "Applications";
const DAILY_EMAIL_CAP = 80;
const APPLICATION_HEADERS = [
  "Timestamp",
  "Full name",
  "Age or date of birth",
  "Gender",
  "Email",
  "Phone",
  "Province",
  "District",
  "Municipality / full address",
  "Current status",
  "College / workplace",
  "Nepal Nursing Council registration number",
  "Why do you want to join?",
  "Consent",
  "email_verified",
  "verified_at"
];
const STATUS_TTL_SECONDS = 600;
const OTP_TTL_SECONDS = 300;
const VERIFICATION_TTL_SECONDS = 1800;
const OTP_SEND_COOLDOWN_SECONDS = 60;
const OTP_EMAILS_PER_HOUR = 3;
const OTP_MAX_ATTEMPTS = 5;
const DISTRICTS_BY_PROVINCE = {
  Koshi: ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"],
  Madhesh: ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"],
  Bagmati: ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"],
  Gandaki: ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur (Nawalparasi East)", "Parbat", "Syangja", "Tanahun"],
  Lumbini: ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Nawalparasi West (Parasi)", "Palpa", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi"],
  Karnali: ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Rukum West", "Salyan", "Surkhet"],
  Sudurpashchim: ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"]
};

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const requestId = String(parameters.requestId || "");
  try {
    if (!/^[A-Za-z0-9-]{10,80}$/.test(requestId)) {
      throw new MembershipRequestError("INVALID_REQUEST", "Invalid request identifier.");
    }

    const action = String(parameters.action || "submit");
    let result;
    if (action === "sendOtp") {
      result = sendOtp(requestId, parameters);
    } else if (action === "verifyOtp") {
      result = verifyOtp(requestId, parameters);
    } else if (action === "submit") {
      const application = validateApplication(parameters);
      verifyTurnstile(application.turnstileToken);
      result = saveApplication(requestId, application);
    } else {
      throw new MembershipRequestError("INVALID_REQUEST", "Unknown membership action.");
    }
    cacheStatus(requestId, result);
    return jsonOutput(result);
  } catch (error) {
    const code = error instanceof MembershipRequestError ? error.code : "SERVER_ERROR";
    console.error("Membership application rejected or failed: " + code);
    const result = { ready: true, ok: false, code: code };
    if (/^[A-Za-z0-9-]{10,80}$/.test(requestId)) {
      cacheStatus(requestId, result);
    }
    return jsonOutput(result);
  }
}

function doGet(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  if (parameters.action !== "status") {
    return jsonOutput({ ok: true, service: "YNAN membership form" });
  }

  const requestId = String(parameters.requestId || "");
  const callback = String(parameters.callback || "");
  if (!/^[A-Za-z0-9-]{10,80}$/.test(requestId)
      || !/^[A-Za-z_$][A-Za-z0-9_$]{0,100}$/.test(callback)) {
    return jsonOutput({ ready: true, ok: false, code: "INVALID_REQUEST" });
  }

  const result = CacheService.getScriptCache().get(statusCacheKey(requestId));
  const status = result ? JSON.parse(result) : { ready: false };
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(status) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function sendOtp(requestId, parameters) {
  const email = normalizeEmail(parameters.email);
  validateEmail(email);
  validateAbuseChecks(parameters);
  verifyTurnstile(String(parameters.turnstileToken || ""));

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = Date.now();
    const emailKey = emailCacheKey(email).slice(0, 32);
    const properties = PropertiesService.getScriptProperties();
    const tracking = readOtpTracking(properties);
    const sentTimes = (tracking[emailKey] || []).filter((sentAt) => now - sentAt < 3600000);
    const lastSentAt = sentTimes.length ? sentTimes[sentTimes.length - 1] : 0;
    if (lastSentAt && now - lastSentAt < OTP_SEND_COOLDOWN_SECONDS * 1000) {
      throw new MembershipRequestError("OTP_COOLDOWN", "Please wait before requesting another code.");
    }
    if (sentTimes.length >= OTP_EMAILS_PER_HOUR) {
      throw new MembershipRequestError("OTP_HOURLY_LIMIT", "Too many codes were requested for this email.");
    }

    const day = Utilities.formatDate(new Date(), "Asia/Kathmandu", "yyyy-MM-dd");
    const dailyKey = "OTP_DAILY_SENT_" + day;
    const dailyCount = Number(properties.getProperty(dailyKey) || "0");
    if (dailyCount >= DAILY_EMAIL_CAP || MailApp.getRemainingDailyQuota() < 1) {
      throw new MembershipRequestError("OTP_DAILY_LIMIT", "The daily email limit has been reached.");
    }

    const code = generateOtpCode();
    const salt = Utilities.getUuid() + Utilities.getUuid();
    const otpRecord = {
      salt: salt,
      hash: hashOtp(salt, code),
      attempts: 0,
      expiresAt: now + OTP_TTL_SECONDS * 1000
    };
    const language = parameters.language === "ne" ? "ne" : "en";
    const body = language === "ne"
      ? "YNAN सदस्यता आवेदनका लागि तपाईंको इमेल पुष्टि कोड: " + code + "\n\nयो कोड ५ मिनेटमा म्याद सकिन्छ।\nयदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, यो इमेल बेवास्ता गर्नुहोस्।"
      : "Your YNAN membership application verification code is: " + code + "\n\nThis code expires in 5 minutes.\nIf you did not request this, ignore this email.";
    CacheService.getScriptCache().put(otpCacheKey(email), JSON.stringify(otpRecord), OTP_TTL_SECONDS);
    sentTimes.push(now);
    tracking[emailKey] = sentTimes;
    properties.setProperty("OTP_RATE_TRACKING", JSON.stringify(tracking));
    properties.setProperty(dailyKey, String(dailyCount + 1));
    try {
      MailApp.sendEmail({
        to: email,
        subject: "Your YNAN verification code",
        body: body,
        name: "Young Nurses Association of Nepal"
      });
    } catch (error) {
      CacheService.getScriptCache().remove(otpCacheKey(email));
      console.error("Membership verification email could not be sent.");
      throw new MembershipRequestError("OTP_SEND_ERROR", "Could not send the verification email.");
    }
    return { ready: true, ok: true, code: "OTP_SENT", retryAfter: OTP_SEND_COOLDOWN_SECONDS };
  } finally {
    lock.releaseLock();
  }
}

function verifyOtp(requestId, parameters) {
  const email = normalizeEmail(parameters.email);
  validateEmail(email);
  const code = String(parameters.otp || "");
  if (!/^\d{6}$/.test(code)) throw new MembershipRequestError("OTP_WRONG", "The code did not match.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const key = otpCacheKey(email);
    const serialized = cache.get(key);
    if (!serialized) throw new MembershipRequestError("OTP_EXPIRED", "The code expired or was not requested.");

    const record = JSON.parse(serialized);
    if (Date.now() >= record.expiresAt) {
      cache.remove(key);
      throw new MembershipRequestError("OTP_EXPIRED", "The code expired.");
    }
    if (!constantTimeEqual(hashOtp(record.salt, code), record.hash)) {
      record.attempts += 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        cache.remove(key);
        throw new MembershipRequestError("OTP_TOO_MANY_ATTEMPTS", "Too many incorrect codes were entered.");
      }
      cache.put(key, JSON.stringify(record), Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)));
      throw new MembershipRequestError("OTP_WRONG", "The code did not match.");
    }

    cache.remove(key);
    const verifiedAt = Date.now();
    cache.put(verificationCacheKey(email), JSON.stringify({
      email: email,
      verifiedAt: verifiedAt,
      expiresAt: verifiedAt + VERIFICATION_TTL_SECONDS * 1000
    }), VERIFICATION_TTL_SECONDS);
    return { ready: true, ok: true, code: "EMAIL_VERIFIED" };
  } finally {
    lock.releaseLock();
  }
}

function generateOtpCode() {
  const limit = 268000000;
  while (true) {
    const randomHex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    for (let index = 0; index + 7 <= randomHex.length; index += 7) {
      const sample = parseInt(randomHex.slice(index, index + 7), 16);
      if (sample < limit) return String(sample % 1000000).padStart(6, "0");
    }
  }
}

function hashOtp(salt, code) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ":" + code,
    Utilities.Charset.UTF_8
  );
  return bytes.map((byte) => ("0" + ((byte + 256) % 256).toString(16)).slice(-2)).join("");
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function validateAbuseChecks(parameters) {
  if (String(parameters.website || "").trim()) {
    throw new MembershipRequestError("SPAM", "Honeypot field was filled.");
  }
  const startedAt = Number(parameters.startedAt);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 3000 || elapsed > 86400000) {
    throw new MembershipRequestError("TOO_FAST", "Submission timing was not valid.");
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateEmail(email) {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new MembershipRequestError("INVALID_EMAIL", "Email address was not valid.");
  }
}

function emailCacheKey(email) {
  return hashOtp("ynan-email-key", email);
}

function otpCacheKey(email) {
  return "ynan_otp_" + emailCacheKey(email);
}

function verificationCacheKey(email) {
  return "ynan_verified_" + emailCacheKey(email);
}

function readOtpTracking(properties) {
  const raw = properties.getProperty("OTP_RATE_TRACKING") || "{}";
  let tracking;
  try {
    tracking = JSON.parse(raw);
  } catch (error) {
    console.error("OTP send tracking could not be read; refusing to send.");
    throw new MembershipRequestError("OTP_SEND_ERROR", "Could not read email sending limits.");
  }
  const cutoff = Date.now() - 3600000;
  Object.keys(tracking).forEach((key) => {
    tracking[key] = Array.isArray(tracking[key])
      ? tracking[key].filter((sentAt) => Number(sentAt) > cutoff)
      : [];
    if (!tracking[key].length) delete tracking[key];
  });
  return tracking;
}

function validateApplication(parameters) {
  const application = {
    fullName: cleanText(parameters.fullName, 120, true),
    ageOrDob: cleanText(parameters.ageOrDob, 20, true),
    gender: cleanText(parameters.gender, 30, true),
    email: cleanText(parameters.email, 254, true).toLowerCase(),
    phone: cleanText(parameters.phone, 20, true),
    province: cleanText(parameters.province, 30, true),
    district: cleanText(parameters.district, 100, true),
    address: cleanText(parameters.address, 300, true),
    currentStatus: cleanText(parameters.currentStatus, 40, true),
    collegeWorkplace: cleanText(parameters.collegeWorkplace, 150, true),
    councilNumber: cleanText(parameters.councilNumber, 100, false),
    reason: cleanText(parameters.reason, 500, false),
    consent: String(parameters.consent || ""),
    honeypot: String(parameters.website || ""),
    startedAt: Number(parameters.startedAt),
    turnstileToken: String(parameters.turnstileToken || "")
  };

  if (application.honeypot) throw new MembershipRequestError("SPAM", "Honeypot field was filled.");
  const elapsed = Date.now() - application.startedAt;
  if (!Number.isFinite(application.startedAt) || elapsed < 3000 || elapsed > 86400000) {
    throw new MembershipRequestError("TOO_FAST", "Submission timing was not valid.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(application.email)) {
    throw new MembershipRequestError("INVALID_EMAIL", "Email address was not valid.");
  }
  const phone = application.phone.replace(/[\s()-]/g, "");
  if (!/^(?:\+?977)?9[6-8]\d{8}$/.test(phone)) {
    throw new MembershipRequestError("INVALID_PHONE", "Mobile number was not valid.");
  }
  if (!["Female", "Male", "Other", "Prefer not to say"].includes(application.gender)) {
    throw new MembershipRequestError("INVALID_GENDER", "Gender option was not valid.");
  }
  if (!["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"].includes(application.province)) {
    throw new MembershipRequestError("INVALID_PROVINCE", "Province option was not valid.");
  }
  if (!DISTRICTS_BY_PROVINCE[application.province].includes(application.district)) {
    throw new MembershipRequestError("INVALID_DISTRICT", "District does not belong to the selected province.");
  }
  if (!["Nursing student", "New graduate", "Practicing nurse", "Other"].includes(application.currentStatus)) {
    throw new MembershipRequestError("INVALID_STATUS", "Current status option was not valid.");
  }
  if (application.consent !== "true") {
    throw new MembershipRequestError("CONSENT_REQUIRED", "Membership consent is required.");
  }
  validateAgeOrDate(application.ageOrDob);
  return application;
}

function validateAgeOrDate(value) {
  const ageMatch = value.match(/^AGE:(\d{1,3})$/);
  if (ageMatch) {
    const age = Number(ageMatch[1]);
    if (age >= 15 && age <= 100) return;
    throw new MembershipRequestError("INVALID_AGE", "Age must be between 15 and 100.");
  }

  const dateMatch = value.match(/^DOB:(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) throw new MembershipRequestError("INVALID_AGE", "Age or date of birth is required.");
  const birthDate = new Date(dateMatch[1] + "T00:00:00Z");
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== dateMatch[1]) {
    throw new MembershipRequestError("INVALID_AGE", "Date of birth is not valid.");
  }
  const nepalDate = Utilities.formatDate(new Date(), "Asia/Kathmandu", "yyyy-MM-dd");
  const now = new Date(nepalDate + "T00:00:00Z");
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth()
      || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  if (age < 15 || age > 100) {
    throw new MembershipRequestError("INVALID_AGE", "Date of birth must represent an age between 15 and 100.");
  }
}

function saveApplication(requestId, application) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const priorResult = cache.get(statusCacheKey(requestId));
    if (priorResult) return JSON.parse(priorResult);
    const verificationKey = verificationCacheKey(application.email);
    const verificationRaw = cache.get(verificationKey);
    if (!verificationRaw) {
      throw new MembershipRequestError("EMAIL_NOT_VERIFIED", "A valid email verification is required.");
    }
    const verification = JSON.parse(verificationRaw);
    if (verification.email !== application.email || Date.now() >= verification.expiresAt) {
      cache.remove(verificationKey);
      throw new MembershipRequestError("EMAIL_NOT_VERIFIED", "Email verification expired or did not match.");
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new MembershipRequestError("SHEET_UNAVAILABLE", "The bound spreadsheet could not be opened.");
    let sheet = spreadsheet.getSheetByName(APPLICATION_SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(APPLICATION_SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, APPLICATION_HEADERS.length).setValues([APPLICATION_HEADERS]);
      sheet.setFrozenRows(1);
    } else {
      const baseHeaderCount = APPLICATION_HEADERS.length - 2;
      const existingHeaders = sheet.getRange(1, 1, 1, baseHeaderCount).getDisplayValues()[0];
      if (APPLICATION_HEADERS.slice(0, baseHeaderCount).some((header, index) => existingHeaders[index] !== header)) {
        throw new MembershipRequestError("SHEET_HEADERS", "The Applications sheet header row does not match the setup guide.");
      }
      const verificationHeaders = sheet.getRange(1, baseHeaderCount + 1, 1, 2).getDisplayValues()[0];
      if (!verificationHeaders[0] && !verificationHeaders[1]) {
        sheet.getRange(1, baseHeaderCount + 1, 1, 2).setValues([APPLICATION_HEADERS.slice(baseHeaderCount)]);
      } else if (verificationHeaders[0] !== "email_verified" || verificationHeaders[1] !== "verified_at") {
        throw new MembershipRequestError("SHEET_HEADERS", "The email verification columns must be email_verified and verified_at.");
      }
    }

    if (sheet.getLastRow() > 1) {
      const emails = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).getDisplayValues();
      const duplicate = emails.some((row) => String(row[0]).trim().toLowerCase() === application.email);
      if (duplicate) throw new MembershipRequestError("DUPLICATE_EMAIL", "This email address already has an application.");
    }

    const row = [
      new Date(),
      safeSheetText(application.fullName),
      safeSheetText(application.ageOrDob),
      safeSheetText(application.gender),
      safeSheetText(application.email),
      safeSheetText(application.phone),
      safeSheetText(application.province),
      safeSheetText(application.district),
      safeSheetText(application.address),
      safeSheetText(application.currentStatus),
      safeSheetText(application.collegeWorkplace),
      safeSheetText(application.councilNumber),
      safeSheetText(application.reason),
      "Yes",
      true,
      new Date(verification.verifiedAt)
    ];
    sheet.appendRow(row);
    cache.remove(verificationKey);

    const result = { ready: true, ok: true, code: "OK" };
    cache.put(statusCacheKey(requestId), JSON.stringify(result), STATUS_TTL_SECONDS);
    sendNotificationIfConfigured();
    return result;
  } finally {
    lock.releaseLock();
  }
}

function cleanText(value, maxLength, required) {
  const text = String(value == null ? "" : value).trim();
  if (required && !text) throw new MembershipRequestError("REQUIRED_FIELD", "A required field was empty.");
  if (text.length > maxLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new MembershipRequestError("INVALID_FIELD", "A field contained invalid text.");
  }
  return text;
}

function safeSheetText(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function verifyTurnstile(token) {
  const secret = PropertiesService.getScriptProperties().getProperty("TURNSTILE_SECRET_KEY");
  if (!secret) return;
  if (!token) throw new MembershipRequestError("TURNSTILE_REQUIRED", "Security check was missing.");

  const response = UrlFetchApp.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "post",
    payload: { secret: secret, response: token },
    muteHttpExceptions: true
  });
  const result = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || !result.success) {
    throw new MembershipRequestError("TURNSTILE_FAILED", "Security check could not be verified.");
  }
}

function sendNotificationIfConfigured() {
  const recipient = PropertiesService.getScriptProperties().getProperty("YNAN_NOTIFICATION_EMAIL");
  if (!recipient) return;
  if (MailApp.getRemainingDailyQuota() < 1) {
    console.warn("Membership notification skipped because the daily email quota is exhausted.");
    return;
  }
  try {
    MailApp.sendEmail({
      to: recipient,
      subject: "New YNAN membership application",
      body: "A new membership application has been received. Sign in to the private membership Google Sheet to review it."
    });
  } catch (error) {
    console.error("Membership notification email failed to send.");
  }
}

function cacheStatus(requestId, result) {
  CacheService.getScriptCache().put(statusCacheKey(requestId), JSON.stringify(result), STATUS_TTL_SECONDS);
}

function statusCacheKey(requestId) {
  return "ynan_membership_status_" + requestId;
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function MembershipRequestError(code, message) {
  this.name = "MembershipRequestError";
  this.code = code;
  this.message = message;
}
MembershipRequestError.prototype = Object.create(Error.prototype);
MembershipRequestError.prototype.constructor = MembershipRequestError;
