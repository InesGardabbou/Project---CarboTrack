/**
 * Firebase Cloud Functions - Teams Meetings API
 * 
 * Deploy this to Firebase Cloud Functions to handle Teams meeting creation
 * 
 * Steps:
 * 1. npm install firebase-functions firebase-admin axios
 * 2. Copy this code to functions/index.js
 * 3. Set environment variables in Firebase Console
 * 4. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// ============================================
// GET /api/meetings
// Fetch user's meetings from Firestore
// ============================================
exports.getMeetings = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from auth token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Fetch meetings from Firestore
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('meetings')
      .where('startDateTime', '>=', new Date().toISOString())
      .orderBy('startDateTime', 'asc')
      .limit(20)
      .get();

    const meetings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// ============================================
// POST /api/meetings
// Create a new Teams meeting via Microsoft Graph
// ============================================
exports.createMeeting = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const { startDateTime, endDateTime, subject } = req.body;

    if (!startDateTime || !endDateTime || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's Microsoft Graph token (you need to implement OAuth flow)
    // For now, using the Firebase token is a placeholder
    const userDoc = await db.collection('users').doc(userId).get();
    const graphToken = userDoc.data()?.microsoftGraphToken;

    if (!graphToken) {
      return res.status(400).json({
        error: 'Microsoft Graph token not found. Please authorize Teams integration.',
      });
    }

    // Call Microsoft Graph API to create meeting
    const graphResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings`,
      {
        startDateTime,
        endDateTime,
        subject,
      },
      {
        headers: {
          Authorization: `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meeting = graphResponse.data;

    // Save meeting to Firestore
    await db
      .collection('users')
      .doc(userId)
      .collection('meetings')
      .doc(meeting.id)
      .set({
        id: meeting.id,
        subject: meeting.subject,
        startDateTime: meeting.startDateTime,
        endDateTime: meeting.endDateTime,
        joinWebUrl: meeting.joinWebUrl,
        organizer: decodedToken.email,
        participants: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(201).json({
      id: meeting.id,
      subject: meeting.subject,
      startDateTime: meeting.startDateTime,
      endDateTime: meeting.endDateTime,
      joinWebUrl: meeting.joinWebUrl,
    });
  } catch (error) {
    console.error('Error creating meeting:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Microsoft Graph authorization failed' });
    }

    res.status(500).json({
      error: 'Failed to create meeting',
      details: error.message,
    });
  }
});

// ============================================
// DELETE /api/meetings/:id
// Delete a meeting
// ============================================
exports.deleteMeeting = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const meetingId = req.path.split('/').pop();

    await db
      .collection('users')
      .doc(userId)
      .collection('meetings')
      .doc(meetingId)
      .delete();

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// ============================================
// Export routes
// ============================================
/*
Express-like routing (if using Express framework):

const express = require('express');
const app = express();
const meetingsRouter = express.Router();

meetingsRouter.get('/', getMeetings);
meetingsRouter.post('/', createMeeting);
meetingsRouter.delete('/:id', deleteMeeting);

module.exports = meetingsRouter;
*/
