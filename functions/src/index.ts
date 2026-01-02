import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Shared logic to delete a user (Auth + Firestore)
async function performUserDeletion(callerUid: string, userIdToDelete: string) {
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
}

/**
 * Cloud Function to delete a user from Firebase Authentication
 * Only admins can call this function (Callable)
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

  try {
    await performUserDeletion(callerUid, userIdToDelete);
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

/**
 * HTTP endpoint with CORS to delete a user (for environments where onCall may hit CORS issues)
 */
export const deleteAuthUserHttp = functions.https.onRequest(async (req, res) => {
  const applyCors = () => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  };

  applyCors();

  if (req.method === "OPTIONS") {
    applyCors();
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    applyCors();
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      applyCors();
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerUid = decoded.uid;
    const userIdToDelete = req.body?.userId;

    await performUserDeletion(callerUid, userIdToDelete);
    applyCors();
    res.status(200).json({ success: true, message: "User deleted successfully." });
    return;
  } catch (error: any) {
    console.error("Error deleting user (HTTP):", error);
    const message = error?.message || "Failed to delete user.";
    const status = error?.code === "permission-denied" ? 403 :
      error?.code === "failed-precondition" ? 412 :
      error?.code === "invalid-argument" ? 400 : 500;
    applyCors();
    res.status(status).json({ error: message });
    return;
  }
});
