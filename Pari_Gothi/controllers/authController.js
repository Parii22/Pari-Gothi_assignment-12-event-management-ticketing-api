const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebaseConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper to check DB initialization
const checkDb = (res) => {
  if (!db) {
    res.status(503).json({
      success: false,
      message: 'Database connection is not initialized. Please configure Firebase credentials.'
    });
    return false;
  }
  return true;
};

/**
 * Register a new user (Organizer or Attendee)
 */
exports.register = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const normalizedRole = (role || 'attendee').toLowerCase();
    if (!['organizer', 'attendee'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Role must be either "organizer" or "attendee".'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingUserSnapshot = await usersRef.where('email', '==', normalizedEmail).get();

    if (!existingUserSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user document
    const userDocRef = usersRef.doc();
    const createdAt = new Date().toISOString();

    const newUser = {
      id: userDocRef.id,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      createdAt
    };

    await userDocRef.set(newUser);

    // Sign JWT
    const tokenPayload = {
      id: userDocRef.id,
      userId: userDocRef.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const sanitizedUser = {
      id: userDocRef.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    };

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user & return JWT token
 */
exports.login = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', normalizedEmail).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const tokenPayload = {
      id: userDoc.id,
      userId: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const sanitizedUser = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: userData.createdAt
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get authenticated user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const userId = req.user.id;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const userData = userDoc.data();
    const sanitizedUser = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      createdAt: userData.createdAt
    };

    return res.status(200).json({
      success: true,
      data: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
};
