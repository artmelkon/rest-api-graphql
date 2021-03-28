const fs = require('fs');
const path = require('path');

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.error(err));
}

exports.clearImage = clearImage;