const { google } = require('google-auth-library');
// const fetch = require('node-fetch');
const path = require('path');

const keyFile = path.join(__dirname, 'secrets/law-office-notifications-firebase-adminsdk-fbsvc-6d48b6bbf0.json');
const projectId = 'law-office-notifications'; // copy from service account JSON

async function getAccessToken() {
  const client = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const authClient = await client.getClient();
  const tokenResponse = await authClient.getAccessToken();
  return tokenResponse.token;
}

async function sendPushNotification(fcmToken, title, body, extraData = {}) {
  const accessToken = await getAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: { title, body },
      data: extraData,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  return response.json();
}

module.exports = { sendPushNotification };