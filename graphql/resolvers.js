const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

module.exports = {
  createUser: async function({ userInput }, req) {
    // const name = args.userInput.name; // one the options to asign a value
    const { name, email, password } = userInput; // destructuring object

    const errors = [];
    if(!validator.isEmail(email)) {
      errors.push({ message: 'Invalid Email, please try again!'})
    }
    if(validator.isEmpty(password) || 
    !validator.isLength(password, { min: 5 })) {
      errors.push({ massage: 'Password is too short!' });
    }
    if(errors.length > 0) {
      const error = new Error('Invalid input!');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: email });
    if(existingUser) {
      const error = new Error('User already exists!');
      throw error;
    }
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      name: name,
      email: email,
      password: hashedPw
    })

    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function({ email, password }) {
    const user = await User.findOne({ email: email });
    if(!user) {
      const error = new Error('User not found!');
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if(!isEqual) {
      const error = new Error('Incorrect Password!');
      error.code = 401;
      throw error;
    }
    const token = jwt.sign({
      userId: user._id.toString(),
      email: user.email
    },
      'mySecretToken',
      { expiresIn: '1h'}
    );
    return {token: token, userId: user._id.toString() };
  },
  createPost: async function({ postInput }, req) {
    if(!req.isAuth) {
      const error = new Error('Not Authenticated!');
      error.code = 401;
      throw error;
    }

    const errors = [];
    if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5})) {
      errors.push({ message: 'Title is invalid!'});
    }
    if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
      errors.push({ message: 'Content is invalid!'});
    }
    if(errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.cade = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if(!user) {
      const error = new Error('Invalid user!');
      error.data = errors;
      error.code = 401;
      throw error;
    }
    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user
    });
    const createdPost = await post.save();
    console.log(createdPost._doc);
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc, 
      _id: createdPost._id.toString(), 
      createdAt: createdPost.createdAt.toISOString(), 
      updatedAt: createdPost.updatedAt.toISOString()
    };
  },
  posts: async function({ page },req) {
    console.log(req);
    if(!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    if(!page) {
      page = 1; 
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1})
      .skip((page -1) * perPage)
      .limit(perPage)
      .populate('creator');

    return {
      posts: posts.map(p => {
        return { 
          ...p._doc, 
          _id: p._id.toString(), 
          createdAt: p.createdAt.toISOString(), 
          updatedAt: p.updatedAt.toISOString() 
        }
      }),
      totalPosts: totalPosts
    }
  }
}