# YNAN membership form setup

The form is ready to use after you connect it to a private Google Sheet and deploy the Apps Script. Until that is done, the form deliberately will not claim an application was submitted.

## 1. Create the private Google Sheet

1. Sign in to the Google account that will own membership applications and create a new Google Sheet.
2. Name the spreadsheet something recognizable, such as **YNAN Membership Applications**.
3. Keep the spreadsheet private. Do not publish it to the web.
4. Create a tab named **Applications**. Add this header row in row 1, in this exact order:

   `Timestamp | Full name | Age or date of birth | Gender | Email | Phone | Province | District | Municipality / full address | Current status | College / workplace | Nepal Nursing Council registration number | Why do you want to join? | Consent | email_verified | verified_at`

The script can create the tab and header if they are missing. If you already set up the earlier form, it adds the last two verification columns to a matching 14-column header.

## 2. Add and deploy the Google Apps Script

1. In the Sheet, choose **Extensions > Apps Script**.
2. Replace the starter code with the contents of `apps-script/Code.gs`, then save.
3. Choose **Deploy > New deployment**. Select the gear and choose **Web app**.
4. Set **Execute as** to **Me** and **Who has access** to **Anyone**, then deploy.
5. Approve Google's permission request. The first time you send an email code, Google may ask you to allow the script to send email. Review and approve that permission while signed in as the account that owns the script.
6. Copy the deployed web app URL. Do not share the Sheet itself publicly.

The web app needs public access so the static website can request codes and send applications. The Sheet remains private; only the account deploying the script and people you explicitly share it with can open it.

### Show the YNAN logo as the sender picture

The round picture next to the email in Gmail is the profile photo of the Google account that owns and sends from the Apps Script. Apps Script cannot replace that picture for an individual message. To show the YNAN logo there, sign in to that Google account, open its Google Account profile settings, and change its profile picture to the YNAN logo (`assets/ynan-logo.jpg`). Google may take time to update the sender picture for recipients. The script already sets the sender display name to **Young Nurses Association of Nepal**.

## 3. Connect the site

1. The deployed web app URL is already set in the `APPS_SCRIPT_URL` value at the top of `assets/js/membership.js`.
2. If you deploy a new Apps Script version with a different URL, replace that value with the new URL (beginning with `https://script.google.com/macros/s/`).
3. Save and publish the site through the usual GitHub/Cloudflare Pages workflow.

The browser sends a form-encoded POST without reading its cross-origin response. It then checks a short-lived status response from the Apps Script web app before showing success. This avoids treating an unreadable cross-origin response as a successful application.

## 4. Set the daily email limit

Near the top of `apps-script/Code.gs`, find `DAILY_EMAIL_CAP = 80`. Change `80` to the daily limit you want, then save and deploy a new version. The default is 80 to stay below the ordinary Gmail daily sending limit. Google also sets its own account-based sending quota; the smaller remaining limit applies. The script separately allows up to 3 code emails per address per hour, enforces a 60-second wait between sends, expires a code after five minutes, and allows five incorrect code attempts. A successful email verification is valid for 30 minutes to complete the application.

## 5. Test with your own email

1. Open the published site and choose **Become a Member**.
2. Enter an email address you can open and select **Send code**.
3. Check the inbox for **Your YNAN verification code**. Enter the six digits on the form and select **Verify code**. Codes expire in five minutes; a new code can be requested after the 60-second countdown.
4. If the email does not arrive, check Spam/Junk and search for the subject above. Also check that the Apps Script owner approved the email permission and has not reached Google's daily email quota.
5. Complete the other fields using clearly fake test details and a valid Nepal mobile number, such as `9812345678`, then submit.
6. Confirm the new row appears in the private Sheet with `email_verified` set to TRUE and `verified_at` filled in. The phone number is not verified.
7. Submit again using that email; the form should report that an application with the email is already on file.
8. Remove the fake row when testing is finished. Do not use real member details for setup tests.

For validation, you can also try an incorrect code, wait five minutes and try an expired code, or enter five incorrect codes to check the attempt limit. Avoid repeatedly sending test codes: the per-email hourly and daily limits apply to your test address too.

The script rejects missing/invalid data, a filled honeypot, a form completed in under three seconds, invalid/expired email codes, and duplicate email addresses. A code is locked after five incorrect attempts. Repeated submission with the same request ID does not append another row.

## 6. Share the Sheet and enable optional application notifications

- Share the Sheet only with committee members who manage membership. Give edit access only to people who need to maintain records.
- The script does not automatically delete old rows. Set a calendar reminder to delete unsuccessful applications after 12 months and review accepted-member records annually; keep track of application outcomes using the committee's private process.
- Optional new-application notifications are off by default. To enable them, open Apps Script **Project Settings > Script properties** and add `YNAN_NOTIFICATION_EMAIL` with the committee inbox address as its value.
- Notifications contain only a short message and no applicant details. Apps Script checks Google's remaining daily email quota before sending. Check Google's current Apps Script quota page if messages stop. Notification email is optional and does not determine whether an application is saved.

## 7. Optional Cloudflare Turnstile

Turnstile is off by default; the honeypot and three-second minimum-time checks work without it.

1. In Cloudflare, create a Turnstile widget for the website's real domain and copy its **site key** and **secret key**.
2. In `assets/js/membership.js`, change `TURNSTILE_ENABLED` to `true` and replace `PASTE_YOUR_TURNSTILE_SITE_KEY_HERE` with the site key. The site key is public.
3. In Apps Script **Project Settings > Script properties**, add `TURNSTILE_SECRET_KEY` with the secret key as its value. Never put the secret key in this repository.
4. Save the script and deploy a new version as explained below. Test a real submission on the configured website domain.

To turn Turnstile off, set `TURNSTILE_ENABLED` back to `false` and remove the `TURNSTILE_SECRET_KEY` script property. The server requires and verifies a token whenever that secret property is present.

## 8. Updating the script or form

- **Script changes:** save the updated Apps Script, then choose **Deploy > Manage deployments**, edit the web app deployment, choose **New version**, and deploy. Keep the web app URL in the site configuration current if Google provides a different one.
- **Form fields:** update the inputs and labels in `join.html`, their English and Nepali text in `assets/js/translations.js`, the client checks/data mapping in `assets/js/membership.js`, and the server checks/header/row order in `apps-script/Code.gs`. Keep the Sheet header and script row in the same order. Update the privacy notice if the collected data changes.
- Do not add Sheet IDs, Turnstile secrets, applicant data, or passwords to the public site or repository.

## Privacy notice items to review

`privacy.html` includes TODO comments asking the committee or a lawyer to confirm the stated retention schedule/legal basis and any extra safeguards for applicants aged 15–17. The current schedule is 12 months for unsuccessful applications, with accepted-member records reviewed annually, as requested. Confirm that policy before publishing.
