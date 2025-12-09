
import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { User, Role, Permission } from '../types';
import { auth, db, firebaseConfig, functions } from '../firebase';
import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// --- MOCK ROLES (Keeping roles hardcoded for simplicity, but permissions could also be in DB) ---
const ALL_PERMISSIONS = Object.values(Permission);

const MOCK_ROLES: Role[] = [
  { id: 'admin', name: 'Admin', permissions: ALL_PERMISSIONS },
  { id: 'sales_manager', name: 'Sales Manager', permissions: [
    Permission.VIEW_SALES_DASHBOARD,
    // Full Lead Access
    Permission.VIEW_LEADS, Permission.CREATE_LEADS, Permission.EDIT_LEADS, Permission.DELETE_LEADS, Permission.ASSIGN_LEADS,
    Permission.CONVERT_LEADS_TO_CUSTOMERS,
    Permission.MANAGE_PROJECTS,
    // Full Task Access
    Permission.VIEW_TASKS, Permission.CREATE_TASKS, Permission.EDIT_TASKS, Permission.DELETE_TASKS,
    Permission.VIEW_ASSIGNED_TO,
    // CRM Reports
    Permission.VIEW_CRM_REPORTS,
    // Calendar permissions (full access)
    Permission.MANAGE_CRM_CALENDAR,
    Permission.VIEW_CALENDARS, Permission.CREATE_CALENDARS, Permission.SHARE_CALENDARS,
    Permission.MANAGE_PUBLIC_BOOKING, Permission.MANAGE_EVENT_REMINDERS,
    Permission.USE_AVAILABILITY_FINDER, Permission.MANAGE_CALENDAR_TASKS, Permission.CUSTOMIZE_SCHEDULE,
    Permission.VIEW_CUSTOMERS, Permission.CREATE_CUSTOMERS, Permission.EDIT_CUSTOMERS, Permission.ASSIGN_CUSTOMERS,
    // Quotation Request Management
    Permission.VIEW_QUOTATION_REQUESTS, Permission.CREATE_QUOTATION_REQUESTS,
    Permission.ASSIGN_QUOTATION_REQUESTS, Permission.PROCESS_QUOTATION_REQUESTS,
    Permission.DELETE_QUOTATION_REQUESTS,
    // Quotations and Invoices
    Permission.VIEW_QUOTATIONS, Permission.CREATE_QUOTATIONS, Permission.EDIT_QUOTATIONS, Permission.DELETE_QUOTATIONS,
    Permission.VIEW_INVOICES,
    Permission.VIEW_ACCOUNTS,
  ]},
  { id: 'assistant_sales_manager', name: 'Assistant Sales Manager', permissions: [
    Permission.VIEW_SALES_DASHBOARD,
    // Full Lead Access (same as Sales Manager)
    Permission.VIEW_LEADS, Permission.CREATE_LEADS, Permission.EDIT_LEADS, Permission.DELETE_LEADS, Permission.ASSIGN_LEADS,
    Permission.CONVERT_LEADS_TO_CUSTOMERS,
    Permission.MANAGE_PROJECTS,
    // Full Task Access
    Permission.VIEW_TASKS, Permission.CREATE_TASKS, Permission.EDIT_TASKS, Permission.DELETE_TASKS,
    Permission.VIEW_ASSIGNED_TO,
    // CRM Reports
    Permission.VIEW_CRM_REPORTS,
    // Calendar permissions (full access)
    Permission.MANAGE_CRM_CALENDAR,
    Permission.VIEW_CALENDARS, Permission.CREATE_CALENDARS, Permission.SHARE_CALENDARS,
    Permission.MANAGE_PUBLIC_BOOKING, Permission.MANAGE_EVENT_REMINDERS,
    Permission.USE_AVAILABILITY_FINDER, Permission.MANAGE_CALENDAR_TASKS, Permission.CUSTOMIZE_SCHEDULE,
    Permission.VIEW_CUSTOMERS, Permission.CREATE_CUSTOMERS, Permission.EDIT_CUSTOMERS, Permission.ASSIGN_CUSTOMERS,
    // Quotation Request Management
    Permission.VIEW_QUOTATION_REQUESTS, Permission.CREATE_QUOTATION_REQUESTS,
    Permission.ASSIGN_QUOTATION_REQUESTS, Permission.PROCESS_QUOTATION_REQUESTS,
    Permission.DELETE_QUOTATION_REQUESTS,
    // Quotations and Invoices
    Permission.VIEW_QUOTATIONS, Permission.CREATE_QUOTATIONS, Permission.EDIT_QUOTATIONS, Permission.DELETE_QUOTATIONS,
    Permission.VIEW_INVOICES,
    Permission.VIEW_ACCOUNTS,
  ]},
  { id: 'sales_executive', name: 'Sales Person', permissions: [
    Permission.VIEW_SALES_DASHBOARD,
    // Limited Lead Access (No Delete, No Global Assign usually)
    Permission.VIEW_LEADS, Permission.CREATE_LEADS, Permission.EDIT_LEADS,
    Permission.CONVERT_LEADS_TO_CUSTOMERS,
    // Limited Task Access (No Delete)
    Permission.VIEW_TASKS, Permission.CREATE_TASKS, Permission.EDIT_TASKS,
    Permission.VIEW_ASSIGNED_TO,
    // CRM Reports (own data only)
    Permission.VIEW_CRM_REPORTS,
    // Calendar permissions (limited - no public booking or sharing)
    Permission.MANAGE_CRM_CALENDAR,
    Permission.VIEW_CALENDARS, Permission.CREATE_CALENDARS,
    Permission.MANAGE_EVENT_REMINDERS, Permission.USE_AVAILABILITY_FINDER,
    Permission.MANAGE_CALENDAR_TASKS, Permission.CUSTOMIZE_SCHEDULE,
    Permission.VIEW_CUSTOMERS, Permission.CREATE_CUSTOMERS,
    // Quotation Request (can create but not assign/process)
    Permission.VIEW_QUOTATION_REQUESTS, Permission.CREATE_QUOTATION_REQUESTS,
    Permission.VIEW_QUOTATIONS,
  ]},
  { id: 'sales_coordinator', name: 'Sales Coordinator', permissions: [
    Permission.VIEW_SALES_DASHBOARD,
    // View leads (to understand context)
    Permission.VIEW_LEADS,
    // Full Task Access (to complete their assigned quotation tasks)
    Permission.VIEW_TASKS, Permission.CREATE_TASKS, Permission.EDIT_TASKS,
    Permission.VIEW_ASSIGNED_TO,
    // Calendar permissions
    Permission.MANAGE_CRM_CALENDAR,
    Permission.VIEW_CALENDARS, Permission.CREATE_CALENDARS,
    Permission.MANAGE_EVENT_REMINDERS, Permission.USE_AVAILABILITY_FINDER,
    Permission.MANAGE_CALENDAR_TASKS, Permission.CUSTOMIZE_SCHEDULE,
    Permission.VIEW_CUSTOMERS,
    // Quotation Request Processing (assigned requests only)
    Permission.VIEW_QUOTATION_REQUESTS, Permission.PROCESS_QUOTATION_REQUESTS,
    // Quotation Management (can create and edit quotations)
    Permission.VIEW_QUOTATIONS, Permission.CREATE_QUOTATIONS, Permission.EDIT_QUOTATIONS,
  ]},
  { id: 'sales_coordination_head', name: 'Sales Coordination Head', permissions: [
    Permission.VIEW_SALES_DASHBOARD,
    // Full Lead Access
    Permission.VIEW_LEADS, Permission.CREATE_LEADS, Permission.EDIT_LEADS, Permission.ASSIGN_LEADS,
    Permission.CONVERT_LEADS_TO_CUSTOMERS,
    // Full Task Access
    Permission.VIEW_TASKS, Permission.CREATE_TASKS, Permission.EDIT_TASKS, Permission.DELETE_TASKS,
    Permission.VIEW_ASSIGNED_TO,
    // CRM Reports
    Permission.VIEW_CRM_REPORTS,
    // Calendar permissions (full access)
    Permission.MANAGE_CRM_CALENDAR,
    Permission.VIEW_CALENDARS, Permission.CREATE_CALENDARS, Permission.SHARE_CALENDARS,
    Permission.MANAGE_PUBLIC_BOOKING, Permission.MANAGE_EVENT_REMINDERS,
    Permission.USE_AVAILABILITY_FINDER, Permission.MANAGE_CALENDAR_TASKS, Permission.CUSTOMIZE_SCHEDULE,
    Permission.VIEW_CUSTOMERS, Permission.CREATE_CUSTOMERS, Permission.EDIT_CUSTOMERS, Permission.ASSIGN_CUSTOMERS,
    // Quotation Request Management (full access to assign and process)
    Permission.VIEW_QUOTATION_REQUESTS, Permission.CREATE_QUOTATION_REQUESTS,
    Permission.ASSIGN_QUOTATION_REQUESTS, Permission.PROCESS_QUOTATION_REQUESTS,
    Permission.DELETE_QUOTATION_REQUESTS,
    // Quotations and Invoices
    Permission.VIEW_QUOTATIONS, Permission.CREATE_QUOTATIONS, Permission.EDIT_QUOTATIONS, Permission.DELETE_QUOTATIONS,
    Permission.VIEW_INVOICES,
  ]},
  { id: 'accountant_head', name: 'Accountant Head', permissions: [
    Permission.VIEW_ACCOUNTS, Permission.VIEW_CUSTOMERS,
    // Basic calendar view access
    Permission.VIEW_CALENDARS, Permission.MANAGE_EVENT_REMINDERS, Permission.CUSTOMIZE_SCHEDULE,
  ]},
];

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  roles: Role[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  adminCreateUser: (email: string, password: string, name: string, roleId: string) => Promise<void>;
  updateUser: (userId: string, data: { name?: string; roleId?: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  getRoleForUser: (user: User) => Role | undefined;
  updateUserRole: (userId: string, roleId: string) => Promise<void>;
  updateRolePermissions: (roleId: string, permission: Permission, granted: boolean) => Promise<void>;
  addRole: (name: string) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [loading, setLoading] = useState(true);

  // Sync Auth State with Real-time Firestore Profile Listener
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Always unsubscribe from previous user listener if it exists to prevent leaks/overlaps
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = undefined;
      }

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          
          // Use onSnapshot instead of getDoc for real-time updates
          unsubscribeFirestore = onSnapshot(userDocRef, async (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data();
              
              // Security Check: Immediate logout if deactivated
              if (userData.isActive === false) {
                  console.warn("User account is deactivated. Logging out.");
                  // Clean up listener before logging out
                  if (unsubscribeFirestore) {
                      unsubscribeFirestore();
                      unsubscribeFirestore = undefined;
                  }
                  await signOut(auth);
                  setCurrentUser(null);
                  return;
              }

              setCurrentUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: userData.name || 'Unknown',
                roleId: userData.roleId || 'sales_executive',
                isActive: userData.isActive ?? true // Default to true if missing
              });
            } else {
              console.warn("User authenticated but no profile found in Firestore");
              // Optional: You might want to logout here too, or handle incomplete profiles
              setCurrentUser(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to user profile:", error);
            setLoading(false);
          });

        } catch (error) {
          console.error("Error setting up user profile listener:", error);
          setCurrentUser(null);
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Fetch all users for Admin usage
  const refreshUsers = useCallback(async () => {
    if (!currentUser) return; 
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedUsers.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          roleId: data.roleId,
          isActive: data.isActive ?? true
        });
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users list", error);
    }
  }, [currentUser]);

  // Real-time listener for users collection
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }

    // Set up real-time listener for users collection
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const fetchedUsers: User[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUsers.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            roleId: data.roleId,
            isActive: data.isActive ?? true
          });
        });
        setUsers(fetchedUsers);
      },
      (error) => {
        console.error("Error listening to users collection:", error);
      }
    );

    // Cleanup listener on unmount or when currentUser changes
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for roles collection with seeding
  useEffect(() => {
    let isSeeding = false;

    // Set up real-time listener for roles collection
    const unsubscribe = onSnapshot(
      collection(db, "roles"),
      (snapshot) => {
        if (snapshot.empty && !isSeeding) {
          // Seed default roles if collection is empty
          isSeeding = true;
          console.log("Seeding default roles to Firestore...");

          const seedRoles = async () => {
            try {
              for (const role of MOCK_ROLES) {
                await setDoc(doc(db, "roles", role.id), {
                  name: role.name,
                  permissions: role.permissions,
                  isSystem: ['admin', 'sales_manager', 'assistant_sales_manager', 'sales_executive', 'sales_coordinator', 'sales_coordination_head', 'accountant_head'].includes(role.id)
                });
              }
              console.log("Default roles seeded successfully");
              // Set roles immediately after seeding
              setRoles(MOCK_ROLES);
            } catch (error) {
              console.error("Error seeding roles:", error);
              // Fallback to MOCK_ROLES on error
              setRoles(MOCK_ROLES);
            }
          };

          seedRoles();
        } else if (!snapshot.empty) {
          // Load roles from Firestore
          try {
            const fetchedRoles: Role[] = [];
            snapshot.forEach((docSnapshot) => {
              const data = docSnapshot.data();
              if (data && data.name) {
                fetchedRoles.push({
                  id: docSnapshot.id,
                  name: data.name,
                  permissions: data.permissions || []
                });
              }
            });
            // Only update if we have roles, otherwise keep current/default
            if (fetchedRoles.length > 0) {
              setRoles(fetchedRoles);
            } else {
              console.warn("No valid roles found in Firestore, using defaults");
              setRoles(MOCK_ROLES);
            }
          } catch (err) {
            console.error("Error processing roles snapshot:", err);
            setRoles(MOCK_ROLES);
          }
        }
      },
      (error) => {
        console.error("Error listening to roles collection:", error);
        // Fallback to MOCK_ROLES on error
        setRoles(MOCK_ROLES);
      }
    );

    return () => unsubscribe();
  }, []);

  const userRole = useMemo(() => {
    if (!currentUser) return null;
    return roles.find(role => role.id === currentUser.roleId);
  }, [currentUser, roles]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Public Register for bootstrapping the first admin
  const register = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create profile in Firestore (Default to admin for self-registration to bootstrap)
    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      roleId: 'admin',
      isActive: true,
      createdAt: new Date().toISOString()
    });
  };

  // Admin Create User - Uses a secondary app instance to avoid logging out the admin
  const adminCreateUser = async (email: string, password: string, name: string, roleId: string) => {
    // Check if secondary app already exists, otherwise create it
    const secondaryAppName = "SecondaryApp";
    let secondaryApp;
    let newUserUid: string | null = null;

    try {
      // Try to get existing app first
      const existingApps = getApps();
      const existingSecondaryApp = existingApps.find(app => app.name === secondaryAppName);

      if (existingSecondaryApp) {
        secondaryApp = existingSecondaryApp;
      } else {
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      }

      const secondaryAuth = getAuth(secondaryApp);

      // Step 1: Create user in Firebase Auth
      console.log("Creating user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
      newUserUid = newUser.uid;
      console.log("User created in Auth with UID:", newUserUid);

      // Step 2: Create user document in Firestore
      console.log("Creating user document in Firestore...");
      try {
        await setDoc(doc(db, "users", newUser.uid), {
          name,
          email,
          roleId,
          isActive: true,
          createdAt: new Date().toISOString()
        });
        console.log("User document created successfully in Firestore");
      } catch (firestoreError: any) {
        console.error("Firestore error:", firestoreError);
        console.error("Firestore error code:", firestoreError.code);
        console.error("Firestore error message:", firestoreError.message);
        throw new Error(`Failed to save user to database: ${firestoreError.message}`);
      }

      // Step 3: Sign out from secondary auth
      await signOut(secondaryAuth);
      console.log("User creation completed successfully");

    } catch (error: any) {
      console.error("Error creating user:", error);
      // If Auth user was created but Firestore failed, we should note this
      if (newUserUid && error.message?.includes('Failed to save user to database')) {
        console.error("Auth user was created but Firestore document failed. UID:", newUserUid);
      }
      throw error;
    } finally {
      // Only delete the app if it was created
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (deleteError) {
          // Ignore delete errors - app might already be deleted
          console.warn("Could not delete secondary app:", deleteError);
        }
      }
    }
  };

  const updateUser = async (userId: string, data: { name?: string; roleId?: string }) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, data);
      
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, ...data } : user
      ));
      
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...data } : null);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Call Cloud Function to delete both Firebase Auth account and Firestore document
      const deleteAuthUser = httpsCallable(functions, 'deleteAuthUser');
      const result = await deleteAuthUser({ userId });

      console.log(`User ${userId} deleted successfully:`, result.data);
      // Real-time listener will automatically update the users list after Firestore deletion
    } catch (error: any) {
      console.error("Error deleting user:", error);

      // Provide user-friendly error messages
      if (error.code === 'functions/unauthenticated') {
        throw new Error('You must be logged in to delete users.');
      } else if (error.code === 'functions/permission-denied') {
        throw new Error('Only administrators can delete users.');
      } else if (error.code === 'functions/failed-precondition') {
        throw new Error('Cannot delete your own account.');
      } else if (error.code === 'functions/not-found') {
        throw new Error('Cloud Function not deployed. Please deploy Firebase Functions first.');
      } else {
        throw new Error(error.message || 'Failed to delete user. Please try again.');
      }
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isActive });

      // Optimistically update local state for admin view
      setUsers(prevUsers => prevUsers.map(user =>
        user.id === userId ? { ...user, isActive } : user
      ));
      
    } catch (error) {
      console.error("Error toggling user status:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const hasPermission = useCallback((permission: Permission): boolean => {
    return userRole?.permissions.includes(permission) ?? false;
  }, [userRole]);

  const getRoleForUser = useCallback((user: User): Role | undefined => {
    return roles.find(role => role.id === user.roleId);
  }, [roles]);

  const updateUserRole = async (userId: string, roleId: string) => {
    await updateUser(userId, { roleId });
  };
  
  const updateRolePermissions = async (roleId: string, permission: Permission, granted: boolean) => {
    // Find current role to get updated permissions
    const currentRole = roles.find(r => r.id === roleId);
    if (!currentRole) {
      throw new Error('Role not found');
    }

    const newPermissions = granted
      ? [...currentRole.permissions, permission]
      : currentRole.permissions.filter(p => p !== permission);

    const uniquePermissions = [...new Set(newPermissions)];

    // Optimistically update local state for immediate UI feedback
    setRoles(prevRoles =>
      prevRoles.map(role =>
        role.id === roleId ? { ...role, permissions: uniquePermissions } : role
      )
    );

    try {
      // Update in Firestore (use setDoc with merge to handle non-existent docs)
      const roleRef = doc(db, "roles", roleId);
      await setDoc(roleRef, {
        name: currentRole.name,
        permissions: uniquePermissions,
        isSystem: ['admin', 'sales_manager', 'assistant_sales_manager', 'sales_executive', 'sales_coordinator', 'sales_coordination_head', 'accountant_head'].includes(roleId)
      }, { merge: true });

      // Real-time listener will sync any discrepancies
    } catch (error) {
      console.error("Error updating role permissions:", error);
      // Revert optimistic update on error
      setRoles(prevRoles =>
        prevRoles.map(role =>
          role.id === roleId ? currentRole : role
        )
      );
      throw error;
    }
  };

  const addRole = async (name: string) => {
    const id = name.toLowerCase().trim().replace(/\s+/g, '_');

    try {
      // Save to Firestore - real-time listener will automatically update local state
      await setDoc(doc(db, "roles", id), {
        name,
        permissions: [],
        isSystem: false
      });

      console.log("Role created successfully:", id);
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  };

  const deleteRole = async (roleId: string) => {
    // Store the role for potential rollback
    const roleToDelete = roles.find(r => r.id === roleId);

    // Optimistically update local state
    setRoles(prev => prev.filter(r => r.id !== roleId));

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "roles", roleId));

      console.log("Role deleted successfully:", roleId);
    } catch (error) {
      console.error("Error deleting role:", error);
      // Revert optimistic update on error
      if (roleToDelete) {
        setRoles(prev => [...prev, roleToDelete]);
      }
      throw error;
    }
  };

  const value = { 
    currentUser, 
    users, 
    roles, 
    loading, 
    login,
    register,
    adminCreateUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    logout, 
    hasPermission, 
    getRoleForUser, 
    updateUserRole, 
    updateRolePermissions,
    addRole,
    deleteRole,
    refreshUsers 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
