import mysql from "mysql2"; // need to npm install
import { MongoClient } from "mongodb"; // need to npm install

function getMysqlTables(mysqlConnection, callback) {
  mysqlConnection.query(
    "show full tables where Table_Type = 'BASE TABLE';",
    function(error, results, _fields) {
      if (error) {
        callback(error);
      } else {
        var tables = [];
        results.forEach(function(row) {
          for (var key in row) {
            if (row.hasOwnProperty(key)) {
              if (key.startsWith("Tables_in")) {
                tables.push(row[key]);
              }
            }
          }
        });
        callback(null, tables);
      }
    },
  );
}

function tableToCollection(
  mysqlConnection,
  tableName,
  mongoCollection,
  callback,
) {
  var sql = "SELECT * FROM " + tableName + ";";
  mysqlConnection.query(sql, function(error, results, _fields) {
    if (error) {
      callback(error);
    } else {
      if (results.length > 0) {
        mongoCollection.insertMany(results, {}, function(error) {
          if (error) {
            callback(error);
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    }
  });
}

MongoClient.connect(
  "mongodb://localhost:27017/importedDb",
  function(error, db) {
    if (error) throw error;

    var MysqlCon = mysql.createConnection({
      host: "localhost",
      user: "admin",
      password: "xcount88",
      port: 8889,
      database: "dukan",
    });

    MysqlCon.connect();

    var jobs = 0;

    getMysqlTables(MysqlCon, function(_error, tables) {
      tables.forEach(function(table) {
        var collection = db.collection(table);
        ++jobs;
        tableToCollection(MysqlCon, table, collection, function(error) {
          if (error) throw error;
          --jobs;
        });
      });
    });

    // Waiting for all jobs to complete before closing databases connections.
    var interval = setInterval(function() {
      if (jobs <= 0) {
        clearInterval(interval);
        console.log("done!");
        db.close();
        MysqlCon.end();
      }
    }, 300);
  },
);