function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.redirect('/login');
  }
  return next();
}

function requireAuthApi(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAuthApi
};
