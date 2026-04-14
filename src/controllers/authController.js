const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

async function renderLogin(req, res) {
  if (req.session?.user) {
    return res.redirect('/');
  }

  return res.render('login', { error: null });
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).render('login', { error: 'Usuario y contrasena son obligatorios.' });
    }

    const user = await userModel.findByUsername(username.trim());

    if (!user || !user.passwordHash) {
      return res.status(401).render('login', { error: 'Credenciales invalidas.' });
    }

    let valid = false;

    try {
      valid = await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      valid = password === user.passwordHash;
    }

    if (!valid) {
      return res.status(401).render('login', { error: 'Credenciales invalidas.' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return res.redirect('/');
  } catch (error) {
    return res.status(500).render('login', { error: `Error al iniciar sesion: ${error.message}` });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

module.exports = {
  renderLogin,
  login,
  logout
};
