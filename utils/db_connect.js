const mongoose = require('mongoose');

const PORT = process.env.PORT || 8080;

module.exports = function(app, MNGDB_URI) {
  mongoose.connect(MNGDB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
    .then(() => {
        app.listen(PORT, () => ( console.log(`NodeJS Server running on Port: ${PORT}`)));
        console.log('MongoDB connected successfully!');
    })
    .catch(err => console.error(err))
}
