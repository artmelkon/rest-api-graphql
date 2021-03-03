const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    const error = new Error('Vailidation failed!');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  try{
    const hashedPw = await bcrypt.hash(password, 12);
    const user = await new User({
      name: name,
      email: email,
      password: hashedPw
    });
    user.save();
    res.status(201).json({ message: 'Userr created successfully!', userId: user._id });
  } catch(err) {
    if(!err.statusCode) return err.statusCode = 500;
    next(err);
  }
}
exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try{
    let loadedUser = await User.findOne({ email: email });
    if(!loadedUser) {
      const error = new Error('Invalid email, please try again!');
      error.statusCode = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, loadedUser.password);
    if(!isEqual) {
      const error = new Error('Wrong password');
      error.statusCode = 401;
      throw error;
    }
    const token = jwt.sign({
      userId: loadedUser._id.toString(),
      email: loadedUser.email
    }, 
    'mySecretToken', 
    { expiresIn: '1h'}
    );
    res.status(200).json({ token: token, userId: loadedUser._id.toString() })
} catch(err) {
    if(!err.statusCode) return err.statusCode = 500;
    next(err);
  }
}
exports.getUpdatedStatus = async (req, res, next) => {
  // console.log(req.userId)
  try{
    const user = await User.findById(req.userId);
    if(!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  } catch(err) {
    if(!err.statusCode) err.statuCode = 500;
    next(err)
  }
}
exports.updateUserStatus = async (req, res, next) => {
  try{
    const user = await User.findById(req.userId);
    if(!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    const status = req.body.status;

    user.updateOne({ status: status });

    res.status(200).json({ message: 'Status upadated successfully!' });
  } catch(err) {
    if(!err.statusCode) err.statusCode = 500;
    next(err);
  }
}