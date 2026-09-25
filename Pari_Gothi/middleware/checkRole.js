/**
 * Role-guard middleware that restricts routes based on user role(s).
 * @param {...string|string[]} roles - Single role string, multiple role arguments, or an array of allowed roles.
 */
const checkRole = (...roles) => {
  const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. This endpoint requires [${allowedRoles.join(', ')}] role.`
      });
    }

    next();
  };
};

module.exports = checkRole;
