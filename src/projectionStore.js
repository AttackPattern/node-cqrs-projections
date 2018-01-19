const mongoose = require('mongoose');

let connection = null;

mongoose.connection
  .on('error', function (error) {
    console.log('Mongoose Error', error);
  })
  .on('close', function () {
    console.log('Database connection closed.');
  });

export default function connect(mongoUrl) {
  if (!connection) {
    connection = new Promise(resolve => {
      function retry() {
        if (mongoose.connection.readyState !== 0) {
          setTimeout(retry, 5000);
        }
        mongoose.connect(mongoUrl)
          .then(function () {
            console.log('Connected to Mongo');
            resolve();
          })
          .catch(() => {
            setTimeout(retry, 1000);
          });
      }
      retry();
    });
  }
  return connection;
}
