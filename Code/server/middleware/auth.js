export const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ message: 'Authentication required' });
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (roles.includes(req.user.role)) {
            return next();
        }
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    };
};
