const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if(!authHeader) {
    req.isAuth = false;
    return next();
  }

  const token = authHeader.split(' ')[1];
  let decodedToken;

  try{
    decodedToken = jwt.verify(token, 'mySecretToken');
  }
  catch(err) {
    err.statusCode = 500;
    req.isAuth = false;
    return next();
  }

  if(!decodedToken) {
    const error = new Error('Unabelt to Authenticate!');
    error.statusCode = 401;
    req.isAuth = false;
    return next();
  }

  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
}