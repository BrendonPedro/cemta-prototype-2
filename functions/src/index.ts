import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

exports.syncUserWithFirebase = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  console.log('Received request headers:', req.headers);
  console.log('Received request body:', req.body);

  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      console.error('Missing userId or email:', { userId, email });
      res.status(400).send('Missing userId or email');
      return;
    }

    const userRecord = await admin.auth().getUserByEmail(email).catch(async (error: any) => {
      if (error.code === 'auth/user-not-found') {
        console.log('User not found, creating new user with ID:', userId);
        return await admin.auth().createUser({ uid: userId, email });
      }
      throw error;
    });

    console.log('User record:', userRecord);
    res.status(200).send({ userRecord });
  } catch (error: any) {
    console.error('Error syncing user with Firebase:', error);
    res.status(500).send('Internal server error');
  }
});
