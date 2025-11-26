import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Cloud Function to delete a user from Firebase Authentication
 * Only admins can call this function
 */
export const deleteAuthUser = functions.https.onCall(async (data, context) => {
  // Check if the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to delete users."
    );
  }

  const callerUid = context.auth.uid;
  const userIdToDelete = data.userId;

  if (!userIdToDelete) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required."
    );
  }

  // Prevent self-deletion
  if (callerUid === userIdToDelete) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Cannot delete your own account."
    );
  }

  try {
    // Verify the caller is an admin
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();

    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller user document not found."
      );
    }

    const callerData = callerDoc.data();
    if (callerData?.roleId !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can delete users."
      );
    }

    // Delete the user from Firebase Authentication
    await admin.auth().deleteUser(userIdToDelete);

    // Delete the user document from Firestore
    await admin.firestore().collection("users").doc(userIdToDelete).delete();

    return { success: true, message: "User deleted successfully." };
  } catch (error: any) {
    console.error("Error deleting user:", error);

    if (error.code === "auth/user-not-found") {
      // User doesn't exist in Auth, just delete from Firestore
      await admin.firestore().collection("users").doc(userIdToDelete).delete();
      return { success: true, message: "User document deleted (Auth user not found)." };
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to delete user."
    );
  }
});
