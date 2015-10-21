var Collection, WebSQLDb, async, compileSort, doNothing, processFind, utils, _;

_ = require('lodash');

async = require('async');

utils = require('./utils');

processFind = require('./utils').processFind;

compileSort = require('./selector').compileSort;

doNothing = function() {};

module.exports = WebSQLDb = (function() {
  function WebSQLDb(options, success, error) {
    var checkV2, ex, migrateToV1, migrateToV2;
    this.collections = {};
    try {
      this.db = window.openDatabase('minimongo_' + options.namespace, '', 'Minimongo:' + options.namespace, 5 * 1024 * 1024);
      if (!this.db) {
        return error(new Error("Failed to create database"));
      }
    } catch (_error) {
      ex = _error;
      if (error) {
        error(ex);
      }
      return;
    }
    migrateToV1 = function(tx) {
      return tx.executeSql('CREATE TABLE docs (\n  col TEXT NOT NULL,\n  id TEXT NOT NULL,\n  state TEXT NOT NULL,\n  doc TEXT,\n  PRIMARY KEY (col, id));', [], doNothing, error);
    };
    migrateToV2 = function(tx) {
      return tx.executeSql('ALTER TABLE docs ADD COLUMN base TEXT;', [], doNothing, error);
    };
    checkV2 = (function(_this) {
      return function() {
        if (_this.db.version === "1.0") {
          return _this.db.changeVersion("1.0", "2.0", migrateToV2, error, function() {
            if (success) {
              return success(_this);
            }
          });
        } else if (_this.db.version !== "2.0") {
          return error("Unknown db version " + _this.db.version);
        } else {
          if (success) {
            return success(_this);
          }
        }
      };
    })(this);
    if (this.db.version === "") {
      this.db.changeVersion("", "1.0", migrateToV1, error, checkV2);
    } else {
      checkV2();
    }
    return this.db;
  }

  WebSQLDb.prototype.addCollection = function(name, success, error) {
    var collection;
    collection = new Collection(name, this.db);
    this[name] = collection;
    this.collections[name] = collection;
    if (success) {
      return success();
    }
  };

  WebSQLDb.prototype.removeCollection = function(name, success, error) {
    delete this[name];
    delete this.collections[name];
    return this.db.transaction(function(tx) {
      return tx.executeSql("DELETE FROM docs WHERE col = ?", [name], success, error);
    }, error);
  };

  return WebSQLDb;

})();

Collection = (function() {
  function Collection(name, db) {
    this.name = name;
    this.db = db;
  }

  Collection.prototype.find = function(selector, options) {
    return {
      fetch: (function(_this) {
        return function(success, error) {
          return _this._findFetch(selector, options, success, error);
        };
      })(this)
    };
  };

  Collection.prototype.findOne = function(selector, options, success, error) {
    var _ref;
    if (_.isFunction(options)) {
      _ref = [{}, options, success], options = _ref[0], success = _ref[1], error = _ref[2];
    }
    return this.find(selector, options).fetch(function(results) {
      if (success != null) {
        return success(results.length > 0 ? results[0] : null);
      }
    }, error);
  };

  Collection.prototype._findFetch = function(selector, options, success, error) {
    error = error || function() {};
    return this.db.readTransaction((function(_this) {
      return function(tx) {
        return tx.executeSql("SELECT * FROM docs WHERE col = ?", [_this.name], function(tx, results) {
          var docs, i, row, _i, _ref;
          docs = [];
          for (i = _i = 0, _ref = results.rows.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            row = results.rows.item(i);
            if (row.state !== "removed") {
              docs.push(JSON.parse(row.doc));
            }
          }
          if (success != null) {
            return success(processFind(docs, selector, options));
          }
        }, error);
      };
    })(this), error);
  };

  Collection.prototype.upsert = function(docs, bases, success, error) {
    var items, _ref;
    _ref = utils.regularizeUpsert(docs, bases, success, error), items = _ref[0], success = _ref[1], error = _ref[2];
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        var ids;
        ids = _.map(items, function(item) {
          return item.doc._id;
        });
        bases = {};
        return async.eachSeries(ids, function(id, callback) {
          return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, id], function(tx2, results) {
            var row;
            tx = tx2;
            if (results.rows.length > 0) {
              row = results.rows.item(0);
              if (row.state === "upserted") {
                bases[row.id] = row.base ? JSON.parse(row.base) : null;
              } else if (row.state === "cached") {
                bases[row.id] = JSON.parse(row.doc);
              }
            }
            return callback();
          });
        }, function() {
          var base, id, item, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = items.length; _i < _len; _i++) {
            item = items[_i];
            id = item.doc._id;
            if (item.base !== void 0) {
              base = item.base;
            } else if (bases[id]) {
              base = bases[id];
            } else {
              base = null;
            }
            _results.push(tx.executeSql("INSERT OR REPLACE INTO docs (col, id, state, doc, base) VALUES (?, ?, ?, ?, ?)", [_this.name, item.doc._id, "upserted", JSON.stringify(item.doc), JSON.stringify(base)], doNothing, error));
          }
          return _results;
        });
      };
    })(this), error, function() {
      if (success) {
        return success(docs);
      }
    });
  };

  Collection.prototype.remove = function(id, success, error) {
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, id], function(tx, results) {
          if (results.rows.length > 0) {
            return tx.executeSql('UPDATE docs SET state="removed" WHERE col = ? AND id = ?', [_this.name, id], function() {
              if (success) {
                return success(id);
              }
            }, error);
          } else {
            return tx.executeSql("INSERT INTO docs (col, id, state, doc) VALUES (?, ?, ?, ?)", [
              _this.name, id, "removed", JSON.stringify({
                _id: id
              })
            ], function() {
              if (success) {
                return success(id);
              }
            }, error);
          }
        }, error);
      };
    })(this), error);
  };

  Collection.prototype.cache = function(docs, selector, options, success, error) {
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        return async.eachSeries(docs, function(doc, callback) {
          return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, doc._id], function(tx, results) {
            var existing;
            if (results.rows.length === 0 || results.rows.item(0).state === "cached") {
              existing = results.rows.length > 0 ? JSON.parse(results.rows.item(0).doc) : null;
              if (!existing || !doc._rev || !existing._rev || doc._rev >= existing._rev) {
                return tx.executeSql("INSERT OR REPLACE INTO docs (col, id, state, doc) VALUES (?, ?, ?, ?)", [_this.name, doc._id, "cached", JSON.stringify(doc)], function() {
                  return callback();
                }, error);
              } else {
                return callback();
              }
            } else {
              return callback();
            }
          }, callback, error);
        }, function(err) {
          var docsMap, sort;
          if (err) {
            if (error) {
              error(err);
            }
            return;
          }
          docsMap = _.object(_.pluck(docs, "_id"), docs);
          if (options.sort) {
            sort = compileSort(options.sort);
          }
          return _this.find(selector, options).fetch(function(results) {
            return _this.db.transaction(function(tx) {
              return async.eachSeries(results, function(result, callback) {
                return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, result._id], function(tx, rows) {
                  if (!docsMap[result._id] && rows.rows.length > 0 && rows.rows.item(0).state === "cached") {
                    if (options.sort && options.limit && docs.length === options.limit) {
                      if (sort(result, _.last(docs)) >= 0) {
                        return callback();
                      }
                    }
                    return tx.executeSql("DELETE FROM docs WHERE col = ? AND id = ?", [_this.name, result._id], function() {
                      return callback();
                    }, error);
                  } else {
                    return callback();
                  }
                }, callback, error);
              }, function(err) {
                if (err != null) {
                  if (error != null) {
                    error(err);
                  }
                  return;
                }
                if (success != null) {
                  return success();
                }
              });
            }, error);
          }, error);
        });
      };
    })(this), error);
  };

  Collection.prototype.pendingUpserts = function(success, error) {
    error = error || function() {};
    return this.db.readTransaction((function(_this) {
      return function(tx) {
        return tx.executeSql("SELECT * FROM docs WHERE col = ? AND state = ?", [_this.name, "upserted"], function(tx, results) {
          var docs, i, row, _i, _ref;
          docs = [];
          for (i = _i = 0, _ref = results.rows.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            row = results.rows.item(i);
            docs.push({
              doc: JSON.parse(row.doc),
              base: row.base ? JSON.parse(row.base) : null
            });
          }
          if (success != null) {
            return success(docs);
          }
        }, error);
      };
    })(this), error);
  };

  Collection.prototype.pendingRemoves = function(success, error) {
    error = error || function() {};
    return this.db.readTransaction((function(_this) {
      return function(tx) {
        return tx.executeSql("SELECT * FROM docs WHERE col = ? AND state = ?", [_this.name, "removed"], function(tx, results) {
          var docs, i, row, _i, _ref;
          docs = [];
          for (i = _i = 0, _ref = results.rows.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            row = results.rows.item(i);
            docs.push(JSON.parse(row.doc)._id);
          }
          if (success != null) {
            return success(docs);
          }
        }, error);
      };
    })(this), error);
  };

  Collection.prototype.resolveUpserts = function(upserts, success, error) {
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        return async.eachSeries(upserts, function(upsert, cb) {
          return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, upsert.doc._id], function(tx, results) {
            if (results.rows.length > 0 && results.rows.item(0).state === "upserted") {
              if (_.isEqual(JSON.parse(results.rows.item(0).doc), upsert.doc)) {
                tx.executeSql('UPDATE docs SET state="cached" WHERE col = ? AND id = ?', [_this.name, upsert.doc._id], doNothing, error);
                return cb();
              } else {
                tx.executeSql('UPDATE docs SET base=? WHERE col = ? AND id = ?', [JSON.stringify(upsert.doc), _this.name, upsert.doc._id], doNothing, error);
                return cb();
              }
            } else {
              return cb();
            }
          }, error);
        }, function(err) {
          if (err) {
            return error(err);
          }
          if (success) {
            return success();
          }
        });
      };
    })(this), error);
  };

  Collection.prototype.resolveRemove = function(id, success, error) {
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        return tx.executeSql('DELETE FROM docs WHERE state="removed" AND col = ? AND id = ?', [_this.name, id], function() {
          if (success) {
            return success(id);
          }
        }, error);
      };
    })(this), error);
  };

  Collection.prototype.seed = function(doc, success, error) {
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, doc._id], function(tx, results) {
          if (results.rows.length === 0) {
            return tx.executeSql("INSERT INTO docs (col, id, state, doc) VALUES (?, ?, ?, ?)", [_this.name, doc._id, "cached", JSON.stringify(doc)], function() {
              if (success) {
                return success(doc);
              }
            }, error);
          } else {
            if (success) {
              return success(doc);
            }
          }
        }, error);
      };
    })(this), error);
  };

  Collection.prototype.cacheOne = function(doc, success, error) {
    error = error || function() {};
    return this.db.transaction((function(_this) {
      return function(tx) {
        return tx.executeSql("SELECT * FROM docs WHERE col = ? AND id = ?", [_this.name, doc._id], function(tx, results) {
          var existing;
          if (results.rows.length === 0 || results.rows.item(0).state === "cached") {
            existing = results.rows.length > 0 ? JSON.parse(results.rows.item(0).doc) : null;
            if (!existing || !doc._rev || !existing._rev || doc._rev >= existing._rev) {
              return tx.executeSql("INSERT OR REPLACE INTO docs (col, id, state, doc) VALUES (?, ?, ?, ?)", [_this.name, doc._id, "cached", JSON.stringify(doc)], function() {
                if (success) {
                  return success(doc);
                }
              }, error);
            } else {
              if (success) {
                return success(doc);
              }
            }
          } else {
            if (success) {
              return success(doc);
            }
          }
        }, error);
      };
    })(this), error);
  };

  return Collection;

})();
