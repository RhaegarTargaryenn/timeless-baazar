# Firebase User Deletion Guide

## How to Delete All Users from Firebase Authentication

### Method 1: Firebase Console (Manual - For Few Users)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **timeless-baazar-e39e9**
3. Click on **Authentication** in the left sidebar
4. Click on **Users** tab
5. For each user:
   - Click the 3 dots menu (⋮) on the right side of the user row
   - Click **Delete account**
   - Confirm deletion

### Method 2: Firebase CLI (Recommended for Multiple Users)

#### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

#### Step 2: Login to Firebase
```bash
firebase login
```

#### Step 3: Create a deletion script

Create a file `deleteAllUsers.js` in your project root:

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function deleteAllUsers() {
  try {
    // List all users
    const listUsersResult = await admin.auth().listUsers();
    const userIds = listUsersResult.users.map(user => user.uid);
    
    console.log(`Found ${userIds.length} users to delete`);
    
    // Delete users in batches
    for (const uid of userIds) {
      await admin.auth().deleteUser(uid);
      console.log(`Deleted user: ${uid}`);
    }
    
    console.log('✅ All users deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting users:', error);
  }
}

deleteAllUsers();
```

#### Step 4: Download Service Account Key
1. Go to Firebase Console → Project Settings (gear icon)
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file as `serviceAccountKey.json` in your project root
5. **Important**: Add this file to `.gitignore` - NEVER commit it to Git!

#### Step 5: Install Firebase Admin SDK
```bash
npm install firebase-admin
```

#### Step 6: Run the script
```bash
node deleteAllUsers.js
```

### Method 3: Using Firebase Console's Security Rules (Temporary Access)

If you just want to delete test data:

1. Go to Firebase Console → Firestore Database
2. Click on **Rules** tab
3. Delete all documents manually from the `users` collection
4. Go to Authentication → Users and delete manually

## After Deleting Users

### Clean up Firestore data:
1. Go to Firestore Database
2. Delete the `users` collection
3. Delete the `orders` collection (if you want to start fresh)

### Re-enable Security Rules:
After testing, make sure to set proper security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == userId;
    }
  }
}
```

## Important Notes:
- Deleting users is **permanent** and **cannot be undone**
- Make sure you have backups if needed
- Test with a few users first before bulk deletion
- Consider disabling authentication temporarily during testing

## Alternative: Disable Signup Instead of Deleting
If you just want to prevent new signups:
1. Go to Firebase Console → Authentication
2. Click on **Sign-in method** tab
3. Disable the sign-in providers temporarily
4. Users can't sign up but existing users can still log in
