"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAuthUserHttp = exports.deleteAuthUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// Shared logic to delete a user (Auth + Firestore)
async function performUserDeletion(callerUid, userIdToDelete) {
    if (!userIdToDelete) {
        throw new functions.https.HttpsError("invalid-argument", "User ID is required.");
    }
    // Prevent self-deletion
    if (callerUid === userIdToDelete) {
        throw new functions.https.HttpsError("failed-precondition", "Cannot delete your own account.");
    }
    // Verify the caller is an admin
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!callerDoc.exists) {
        throw new functions.https.HttpsError("permission-denied", "Caller user document not found.");
    }
    const callerData = callerDoc.data();
    if ((callerData === null || callerData === void 0 ? void 0 : callerData.roleId) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can delete users.");
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
exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
    // Check if the caller is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to delete users.");
    }
    const callerUid = context.auth.uid;
    const userIdToDelete = data.userId;
    try {
        await performUserDeletion(callerUid, userIdToDelete);
        return { success: true, message: "User deleted successfully." };
    }
    catch (error) {
        console.error("Error deleting user:", error);
        if (error.code === "auth/user-not-found") {
            // User doesn't exist in Auth, just delete from Firestore
            await admin.firestore().collection("users").doc(userIdToDelete).delete();
            return { success: true, message: "User document deleted (Auth user not found)." };
        }
        throw new functions.https.HttpsError("internal", error.message || "Failed to delete user.");
    }
});
/**
 * HTTP endpoint with CORS to delete a user (for environments where onCall may hit CORS issues)
 */
exports.deleteAuthUserHttp = functions.https.onRequest(async (req, res) => {
    var _a;
    const applyCors = () => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    };
    applyCors();
    if (req.method === "OPTIONS") {
        applyCors();
        return res.status(204).send("");
    }
    if (req.method !== "POST") {
        applyCors();
        return res.status(405).json({ error: "Method not allowed" });
    }
    try {
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            applyCors();
            return res.status(401).json({ error: "Missing or invalid Authorization header" });
        }
        const idToken = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const callerUid = decoded.uid;
        const userIdToDelete = (_a = req.body) === null || _a === void 0 ? void 0 : _a.userId;
        await performUserDeletion(callerUid, userIdToDelete);
        applyCors();
        return res.status(200).json({ success: true, message: "User deleted successfully." });
    }
    catch (error) {
        console.error("Error deleting user (HTTP):", error);
        const message = (error === null || error === void 0 ? void 0 : error.message) || "Failed to delete user.";
        const status = (error === null || error === void 0 ? void 0 : error.code) === "permission-denied" ? 403 :
            (error === null || error === void 0 ? void 0 : error.code) === "failed-precondition" ? 412 :
                (error === null || error === void 0 ? void 0 : error.code) === "invalid-argument" ? 400 : 500;
        applyCors();
        return res.status(status).json({ error: message });
    }
});
//# sourceMappingURL=index.js.map