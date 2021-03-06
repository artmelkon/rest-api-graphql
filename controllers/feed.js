const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

const io = require('../utils/socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.posts = async ( req, res, next ) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  // let totalItems;
  
  try {
    let totalItems = await Post.find().countDocuments();
    const posts  = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
  
    res.status(200).json({ 
      message: 'Data fetched successfuly!', 
      posts: posts, 
      totalItems: totalItems 
    });
  } catch(err) {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
  }
};

exports.createPost = async ( req,res, next ) => {
  /* express vilidation in action */
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    const error = new Error('Validation failed, please enter valid data!');
    error.statusCode = 422;
    throw error;
  }

  if(!req.file) {
    const errors = new Error('No image provided');
    error.statusCode = 422;
    throw error;
  }

  // create post in db
  const imageUrl = req.file.path;
  const { title, content } = req.body; // factored script
  // const title = req.body.title;
  // const content = req.body.content;
  // let creator;
  // console.log(title, content)
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId
  });

  try{
    await post.save();

    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();
    /* getting data through WebSocket IO */
    io.getIO().emit('posts', { action: 'create', post: {...post._doc, creator: { _id: req.userId, name: user.name }} })
    res.status(201).json({
      message: "post created successfully",
      post: post,
      creator: { _id: user._id, name: user.name }
    });
  } catch(err) {
    if(!err.statusCode) err.statusCode = 500;
    next(err);
  }
}

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try{
    const post = await Post.findById(postId);
    if(!post) {
      const error = new Error('Post could not be foudn');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({message: 'Post fetched successfully!', post: post});
  } catch(err) {
    if(!err.statusCode) err.statusCode = 500;
    next(err);
  }
}

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);

  if(!errors.isEmpty()) {
    const error = new Error('Validation faild, entered data is incorrect!');
    error.statusCode = 422;
    throw error;
  }

  const { title, content } = req.body; // refactored code
  let imageUrl = req.body.image;
  // const title = req.body.title;
  // const content = req.body.content;

  if(req.file) {
    imageUrl = req.file.path;
  }
  if(!imageUrl) {
    const error = new Error('No file selected.');
    error.statusCode = 422;
    throw error;
  }

  try{
    const post = await Post.findById(postId).populate('creator')
    if(!post) {
      const error = new Error('Could not find the post!');
      error.statusCode = 404;
      throw error;
    }
    if(post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }
    if(imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;

    const result = await post.save();

    io.getIO().emit('posts', { action: 'update', post: result })

    res.status(200).json({ message: 'Post updated successfully!', post: result });
  } catch(err) {
    if(!err.statusCode) err.statusCode = 500;
    next(err);
  }

}

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try{
    const post = await Post.findById(postId);
    if(!post) {
      const error = new Error('404 - Post could not be found!');
      error.statusCode = 404;
      throw error;
    }
    if(post.creator.toString() !== req.userId) {
      const error = new Error('Not authrized!');
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIO().emit('posts', { action: 'delete', post: postId })
    res.status(200).json({message: 'Post deleted successfully!'});
  } catch(err) {
    if(!err.statusCode) statusCode = 500;
    next(err);
  }
}

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
}
